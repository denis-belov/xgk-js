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



		class Material
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports.material_offsets, 9);

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



			constructor (addr, bind_group_layouts)
			{
				const original_struct =
				{
					topology: wasm.SizeT(addr + Material.original_struct_offsets[0]),

					wgsl_code_vertex: wasm.StdString(addr + Material.original_struct_offsets[5]),

					wgsl_code_fragment: wasm.StdString(addr + Material.original_struct_offsets[6]),

					uniforms: wasm.StdVectorAddr(addr + Material.original_struct_offsets[7]),

					uniform_blocks: wasm.StdVectorAddr(addr + Material.original_struct_offsets[8]),
				};

				this.addr = addr;

				this.topology = Material.ENUM.TOPOLOGY[original_struct.topology];



				const pipeline_configuration =
				{
					layout:

						renderer.device.createPipelineLayout
						({
							bindGroupLayouts: bind_group_layouts,
						}),

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

					LOG(code)
				}



				{
					const code = WasmWrapper.uint8Array2DomString(original_struct.wgsl_code_fragment);

					const shader_module = renderer.device.createShaderModule({ code });

					pipeline_configuration.fragment.module = shader_module;

					LOG(code)
				}



				this.pipeline =
					renderer.device.createRenderPipeline(pipeline_configuration);



				// gl.useProgram(this.program);

				// this.uniforms =
				// 	// TypedArray::map returns TypedArray, but need Array.
				// 	Array.from(original_struct.uniforms)
				// 		.map
				// 		(
				// 			(uniform_addr) =>
				// 			{
				// 				const uniform = new Uniform(uniform_addr);

				// 				uniform.location = gl.getUniformLocation(this.program, uniform.name);

				// 				// Check if shader uses uniform then push uniform to this.uniforms.
				// 				if (uniform.location)
				// 				{
				// 					uniform.update = () =>
				// 					{
				// 						gl.uniformMatrix4fv(uniform.location, false, uniform._data);
				// 					};

				// 					uniform.update();

				// 					return uniform;
				// 				}

				// 				return null;
				// 			},
				// 		)
				// 		.filter((uniform) => uniform);

				// gl.useProgram(null);



				// if (renderer._context.constructor === WebGL2RenderingContext)
				// {
				// 	original_struct.uniform_blocks.forEach
				// 	(
				// 		(uniform_block_addr) =>
				// 		{
				// 			const uniform_block_info = UniformBlock.getInfo(uniform_block_addr);

				// 			gl.uniformBlockBinding
				// 			(
				// 				this.program,
				// 				gl.getUniformBlockIndex(this.program, uniform_block_info.name),
				// 				uniform_block_info.binding,
				// 			);
				// 		},
				// 	);
				// }
			}

			// collectObjects ()

			use ()
			{
				// Material.active_material = this;

				renderer.render_pass_encoder.setPipeline(this.pipeline);

				// this.uniforms.forEach((uniform) => uniform.update());
			}
		};

		this.Material = Material;



		class UniformBlock
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports._ZN3XGK3API15uniform_offsetsE, 3);

			static active_uniform_block = null;

			// static getInfo (addr)
			// {
			// 	const offsets = wasm.SizeTv(wasm.exports.uniform_block_offsets, 2);

			// 	const original_struct =
			// 	{
			// 		binding: wasm.SizeT(addr + UniformBlock.original_struct_offsets[0]),

			// 		name: wasm.StdString(addr + UniformBlock.original_struct_offsets[1]),
			// 	};

			// 	const result =
			// 	{
			// 		binding: original_struct.binding,

			// 		name: WasmWrapper.uint8Array2DomString(original_struct.name),
			// 	};

			// 	return result;
			// }



			constructor (addr)
			{
				// const offsets = wasm.SizeTv(wasm.exports.uniform_block_offsets, 3);

				const original_struct =
				{
					binding: wasm.SizeT(addr + UniformBlock.original_struct_offsets[0]),

					name: wasm.StdString(addr + UniformBlock.original_struct_offsets[1]),

					uniforms: wasm.StdVectorAddr(addr + UniformBlock.original_struct_offsets[2]),
				};

				this.addr = addr;

				this.binding = original_struct.binding;

				this.name = WasmWrapper.uint8Array2DomString(original_struct.name);



				this.buffer = gl.createBuffer();



				gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
				gl.bindBufferBase(gl.UNIFORM_BUFFER, this.binding, this.buffer);

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
								gl.bufferSubData(gl.UNIFORM_BUFFER, uniform.block_index * 4, uniform._data);
							};

							buffer_length += uniform._data.length;

							return uniform;
						},
					);

				gl.bufferData(gl.UNIFORM_BUFFER, buffer_length * 4, gl.DYNAMIC_DRAW);

				this.uniforms.forEach((uniform) => uniform.update());

				gl.bindBuffer(gl.UNIFORM_BUFFER, null);
			}

			// collectObjects ()

			use ()
			{
				// gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);

				// this.uniforms.forEach((uniform) => uniform.update());
			}
		};

		this.UniformBlock = UniformBlock;



		class Object
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

		this.Object = Object;



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

		const _gpu = this._context;

		_gpu.configure
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
