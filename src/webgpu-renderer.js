export default class WebGPURenderer
{
	// dpr
	// renderer info (gl.getParameter(gl.SHADING_LANGUAGE_VERSION)...)
	constructor (wasm, canvas, width, height)
	{
		const WasmWrapper = wasm.constructor;



		/* eslint-disable-next-line consistent-this */
		const renderer = this;

		this.materials = [];

		this.objects = [];



		this.canvas = canvas || document.createElement('canvas');

		this.canvas.width = width;
		this.canvas.height = height;

		this._context = this.canvas.getContext('webgpu');

		const _gpu = this._context;

		this.adapter = null;
		this.device = null;

		this.render_pass_encoder = null;



		class Uniform
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports._ZN3XGK3API15uniform_offsetsE, 4);



			constructor (addr)
			{
				const original_struct =
				{
					object_addr: wasm.Addr(addr + Uniform.original_struct_offsets[0]),

					// Redundant since WebGPU doesn't have single named uniform binding?
					name: wasm.StdString(addr + Uniform.original_struct_offsets[1]),

					// TODO: rename to offset
					block_index: wasm.SizeT(addr + Uniform.original_struct_offsets[2]),

					size: wasm.SizeT(addr + Uniform.original_struct_offsets[3]),
				};

				this.addr = addr;

				this.object_addr = original_struct.object_addr;

				this.name = WasmWrapper.uint8Array2DomString(original_struct.name);

				// uniform block index
				this.block_index = original_struct.block_index;

				this.size = original_struct.size;

				this._data = wasm.Charv2(this.object_addr, this.size);
			}
		};

		this.Uniform = Uniform;



		class Material
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports.material_offsets, 10);

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

			static active_material = null;



			constructor (addr)
			{
				const original_struct =
				{
					topology: wasm.SizeT(addr + Material.original_struct_offsets[0]),

					wgsl_code_vertex: wasm.StdString(addr + Material.original_struct_offsets[5]),

					wgsl_code_fragment: wasm.StdString(addr + Material.original_struct_offsets[6]),

					uniforms: wasm.StdVectorAddr(addr + Material.original_struct_offsets[7]),

					uniform_blocks: wasm.StdVectorAddr(addr + Material.original_struct_offsets[8]),

					dedicated_uniform_block: addr + Material.original_struct_offsets[9],
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
								format: 'bgra8unorm',
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



				const bind_group_layout_descriptor =
				{
					entryCount: 0,
					entries: [],
				};

				const bind_group_descriptor =
				{
					layout: null,

					entry_count: 0,
					entries: [],
				};

				this.dedicated_uniform_block = null;

				if
				(
					wasm.exports.getStdVectorSizeAddr
					(
						original_struct.dedicated_uniform_block +
						UniformBlock.original_struct_offsets[2]
					) > 0
				)
				{
					this.dedicated_uniform_block = new renderer.UniformBlock(original_struct.dedicated_uniform_block);

					bind_group_layout_descriptor.entries.push(this.dedicated_uniform_block.entry_layout);

					++bind_group_layout_descriptor.entryCount;

					bind_group_descriptor.entries.push(this.dedicated_uniform_block.entry);

					++bind_group_descriptor.entryCount;
				}

				original_struct.uniform_blocks.forEach
				(
					(uniform_block_addr) =>
					{
						const uniform_block = new renderer.UniformBlock(uniform_block_addr);

						bind_group_layout_descriptor.entries.push(uniform_block.entry_layout);

						++bind_group_layout_descriptor.entryCount;

						bind_group_descriptor.entries.push(uniform_block.entry);

						++bind_group_descriptor.entryCount;
					},
				);



				const bind_group_layout = renderer.device.createBindGroupLayout(bind_group_layout_descriptor);

				bind_group_descriptor.layout = bind_group_layout;

				this.bind_group =
					renderer.device.createBindGroup(bind_group_descriptor);

				const pipeline_layout_descriptor =
				{
					bindGroupLayouts:
					[
						bind_group_layout,
					],
				};

				pipeline_configuration.layout =
					renderer.device.createPipelineLayout(pipeline_layout_descriptor);



				this.pipeline = renderer.device.createRenderPipeline(pipeline_configuration);

				LOG(this)
			}

			// collectObjects ()

			use ()
			{
				Material.active_material = this;

				if (this.dedicated_uniform_block)
				{
					this.dedicated_uniform_block.use();
				}

				renderer.render_pass_encoder.setBindGroup(0, this.bind_group, []);

				renderer.render_pass_encoder.setPipeline(this.pipeline);
			}
		};

		this.Material = Material;



		class UniformBlock
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports._ZN3XGK3API15uniform_offsetsE, 3);

			static instances = {};

			static active_uniform_block = null;



			constructor (addr)
			{
				if (UniformBlock.instances[addr])
				{
					Object.assign(this, UniformBlock.instances[addr]);

					return this;
				}



				const original_struct =
				{
					binding: wasm.SizeT(addr + UniformBlock.original_struct_offsets[0]),

					name: wasm.StdString(addr + UniformBlock.original_struct_offsets[1]),

					uniforms: wasm.StdVectorAddr(addr + UniformBlock.original_struct_offsets[2]),
				};

				this.addr = addr;

				this.binding = original_struct.binding;

				this.name = WasmWrapper.uint8Array2DomString(original_struct.name);




				this.buffer = null;



				let buffer_length = 0;

				this.uniforms =
					// TypedArray::map returns TypedArray, but need Array.
					Array.from(original_struct.uniforms).map
					(
						(uniform_addr) =>
						{
							const uniform = new Uniform(uniform_addr);

							uniform.update = () =>
							{
								renderer.device.queue.writeBuffer(this.buffer, uniform.block_index, uniform._data, 0, uniform._data.length);
							};

							buffer_length += uniform._data.length;

							return uniform;
						},
					);

				this.buffer =
					renderer.device.createBuffer
					({
						size: buffer_length,

						usage:
						(
							window.GPUBufferUsage.COPY_DST |
							window.GPUBufferUsage.UNIFORM
						),
					});

				this.uniforms.forEach((uniform) => uniform.update());

				this.entry =
				{
					binding: this.binding,

					resource:
					{
						buffer: this.buffer,
						offset: 0,
						size: buffer_length,
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

				UniformBlock.instances[addr] = this;
			}

			// collectObjects ()

			use ()
			{
				this.uniforms.forEach((uniform) => uniform.update());
			}
		};

		this.UniformBlock = UniformBlock;



		class _Object
		{
			constructor (addr)
			{
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



		class Scene
		{
			constructor (addr)
			{
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

		LOG(this.device)

		this._context.configure
		({
			device: this.device,
			format: 'bgra8unorm',
			usage: window.GPUTextureUsage.RENDER_ATTACHMENT,
			// GPUPredefinedColorSpace colorSpace = "srgb";
			// GPUCanvasCompositingAlphaMode compositingAlphaMode = "opaque";
			size: { width: 800, height: 600, depthOrArrayLayers: 1 },
			// size: [ 800, 600 ],
		});
	}
}
