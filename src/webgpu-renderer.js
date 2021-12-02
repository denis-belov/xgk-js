import Base from './base';



export default class WebGPURenderer
{
	// dpr
	constructor (options)
	{
		/* eslint-disable-next-line consistent-this */
		const renderer = this;

		this.wasm_wrapper_instance = options.wasm_wrapper_instance;
		const wasm = this.wasm_wrapper_instance;
		const WasmWrapper = wasm.constructor;

		this.size = options.size || [ 1, 1 ];

		this.canvas = options.canvas || document.createElement('canvas');
		this.canvas.width = this.size[0];
		this.canvas.height = this.size[1];

		this._context = this.canvas.getContext('webgpu');

		this.adapter = null;
		this.device = null;
		this.render_format = options.render_format;

		this.render_pass_encoder = null;



		class Uniform extends wasm.Uniform {};
		this.Uniform = Uniform;



		class UniformBlock extends wasm.UniformBlock
		{
			constructor (addr)
			{
				super(addr);



				this.uniforms =
					// TypedArray::map returns TypedArray, but need Array.
					Array.from(this.original_struct.uniforms).map
					(
						(uniform_addr) =>
						{
							const uniform = Uniform.getInstance(uniform_addr);

							this.buffer_length += uniform._data.length;

							return uniform;
						},
					);

				this.buffer =
					renderer.device.createBuffer
					({
						size: this.buffer_length,

						usage:
						(
							window.GPUBufferUsage.COPY_DST |
							window.GPUBufferUsage.UNIFORM
						),
					});

				this.entry =
				{
					binding: this.binding,

					resource:
					{
						buffer: this.buffer,
						offset: 0,
						size: this.buffer_length,
					},
				};

				this.entry_layout =
				{
					binding: this.binding,

					// !
					visibility: window.GPUShaderStage.VERTEX,

					buffer:
					{
						type: 'uniform',
						hasDynamicOffset: false,
						minBindingSize: 0,
					},
				};

				this.use();
			}

			use ()
			{
				for
				(
					let uniform_index = 0;
					uniform_index < this.uniforms.length;
					++uniform_index
				)
				{
					const uniform = this.uniforms[uniform_index];

					renderer.device.queue.writeBuffer(this.buffer, uniform.block_index, uniform._data, 0, uniform._data.length);
				}
			}
		};

		this.UniformBlock = UniformBlock;



		// Descriptor set is a bind group in vulkak terms.
		class DescriptorSet extends Base
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports.descriptor_set_offsets, 1);

			static original_instances =
				wasm.StdVectorAddr(wasm.exports._ZN8DescriptorSet9instancesE);

			static ENUM =
			{
				BINDING_TYPE:
				{
					UNIFORM_BUFFER: 0,
				},
			};

			static used_instance = null;



			constructor (addr)
			{
				super(addr);

				const original_struct =
				{
					bindings: wasm.StdVectorAddr(addr + DescriptorSet.original_struct_offsets[0]),
				};

				this.addr = addr;



				this.binding_seq = [];
				this.binding_dict = {};

				const bind_group_layout_descriptor =
				{
					entryCount: 0,
					entries: [],
				};

				this.bind_group_descriptor =
				{
					layout: null,

					entryCount: 0,
					entries: [],
				};

				original_struct.bindings.forEach
				(
					(binding_addr) =>
					{
						const binding = UniformBlock.getInstance(binding_addr);

						bind_group_layout_descriptor.entries.push(binding.entry_layout);

						++bind_group_layout_descriptor.entryCount;

						this.bind_group_descriptor.entries.push(binding.entry);

						++this.bind_group_descriptor.entryCount;

						this.binding_seq.push(binding);
						this.binding_dict[binding.name] = binding;
					},
				);



				const bind_group_layout = renderer.device.createBindGroupLayout(bind_group_layout_descriptor);

				this.bind_group_descriptor.layout = bind_group_layout;

				this.bind_group =
					renderer.device.createBindGroup(this.bind_group_descriptor);
			}

			use (bind_group_index)
			{
				renderer.render_pass_encoder.setBindGroup(bind_group_index, this.bind_group, []);

				// use for loop
				this.binding_seq.forEach((binding) => binding.use());
			}
		};

		this.DescriptorSet = DescriptorSet;



		class Material extends Base
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports.material_offsets, 10);

			static original_instances =
				wasm.StdVectorAddr(wasm.exports._ZN8Material9instancesE);

			static ENUM =
			{
				TOPOLOGY:
				[
					'triangle-list', // TRIANGLES
					'point-list', // POINTS
					'line-list', // LINES
					"triangle-strip",
					"line-strip",
				],
			};

			static used_instance = null;



			constructor (addr)
			{
				super(addr);

				const original_struct =
				{
					topology: wasm.SizeT(addr + Material.original_struct_offsets[0]),

					wgsl_code_vertex: wasm.StdString(addr + Material.original_struct_offsets[5]),

					wgsl_code_fragment: wasm.StdString(addr + Material.original_struct_offsets[6]),

					uniforms: wasm.StdVectorAddr(addr + Material.original_struct_offsets[7]),

					uniform_blocks: wasm.StdVectorAddr(addr + Material.original_struct_offsets[8]),

					descriptor_sets: wasm.StdVectorAddr(addr + Material.original_struct_offsets[9]),

					// dedicated_uniform_block: addr + Material.original_struct_offsets[9],

					// glsl450es_code_fragment: wasm.StdVectorUint32(addr + Material.original_struct_offsets[10]),
				};

				this.addr = addr;

				this.topology = Material.ENUM.TOPOLOGY[original_struct.topology];



				const pipeline_configuration =
				{
					layout: null,

					vertex:
					{
						module: null,
						entryPoint: 'main',
						// record<USVString, GPUPipelineConstantValue> constants,

						bufferCount: 1,

						buffers:
						[
							{
								arrayStride: 12,
								stepMode: 'vertex',

								attributeCount: 1,

								attributes:
								[
									{
										format: 'float32x3',
										offset: 0,
										shaderLocation: 0,
									},
								],
							},
						],
					},

					primitive:
					{
						frontFace: 'cw',
						topology: this.topology,
					},

					fragment:
					{
						module: null,
						entryPoint: 'main',

						targetCount: 1,

						targets:
						[
							{
								format: renderer.render_format,
							},
						],
					},
				};



				{
					const code = WasmWrapper.uint8Array2DomString(original_struct.wgsl_code_vertex);

					const shader_module = renderer.device.createShaderModule({ code });

					pipeline_configuration.vertex.module = shader_module;
				}



				{
					const code = WasmWrapper.uint8Array2DomString(original_struct.wgsl_code_fragment);

					const shader_module = renderer.device.createShaderModule({ code });

					pipeline_configuration.fragment.module = shader_module;
				}



				this.descriptor_sets = [];

				const pipeline_layout_descriptor =
				{
					bindGroupLayouts: [],
				};

				original_struct.descriptor_sets.forEach
				(
					(descriptor_set_addr) =>
					{
						const descriptor_set = DescriptorSet.getInstance(descriptor_set_addr);

						pipeline_layout_descriptor.bindGroupLayouts.push(descriptor_set.bind_group_descriptor.layout);

						this.descriptor_sets.push(descriptor_set);
					},
				);

				pipeline_configuration.layout =
					renderer.device.createPipelineLayout(pipeline_layout_descriptor);



				this.pipeline = renderer.device.createRenderPipeline(pipeline_configuration);
			}

			use ()
			{
				Material.used_instance = this;

				// use dedicated_descriptor_set

				renderer.render_pass_encoder.setPipeline(this.pipeline);
			}
		};

		this.Material = Material;



		class _Object extends Base
		{
			constructor (addr)
			{
				super(addr);

				this.addr = addr;

				this.scene_vertex_data_offset = wasm.SizeT(addr, 0) / 3;
				this.scene_vertex_data_length = wasm.SizeT(addr, 1) / 3;

				this.vertex_data = wasm.StdVectorFloat(addr, 2);
			}

			draw ()
			{
				renderer.render_pass_encoder.draw(this.scene_vertex_data_length, 1, this.scene_vertex_data_offset, 0);
			}
		};

		this.Object = _Object;



		class Scene extends Base
		{
			constructor (addr)
			{
				super(addr);

				this.addr = addr;

				this.vertex_data = wasm.StdVectorFloat(addr, 0);
			}
		};

		this.Scene = Scene;
	}

	async init ()
	{
		this.adapter = await navigator.gpu.requestAdapter();

		this.device = await this.adapter.requestDevice();

		if (!this.render_format)
		{
			this.render_format = this._context.getPreferredFormat(this.adapter);
		}

		this._context.configure
		({
			device: this.device,
			format: this.render_format,
			usage: window.GPUTextureUsage.RENDER_ATTACHMENT,
			// GPUPredefinedColorSpace colorSpace = "srgb";
			// GPUCanvasCompositingAlphaMode compositingAlphaMode = "opaque";
			size: { width: this.size[0], height: this.size[1], depthOrArrayLayers: 1 },
			// size: [ 800, 600 ],
		});
	}
}
