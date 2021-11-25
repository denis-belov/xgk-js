export default class WebGLRenderer
{
	// dpr
	// renderer info (gl.getParameter(gl.SHADING_LANGUAGE_VERSION)...)
	constructor (wasm, canvas, _context = 'webgl', width, height)
	{
		const WasmWrapper = wasm.constructor;



		/* eslint-disable-next-line consistent-this */
		const renderer = this;

		this.materials = [];

		this.objects = [];



		this.canvas = canvas || document.createElement('canvas');

		this.canvas.width = width;
		this.canvas.height = height;

		this._context = this.canvas.getContext(_context);

		const gl = this._context;

		gl.viewport(0, 0, width, height);



		class Uniform
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports._ZN3XGK3API15uniform_offsetsE, 3);



			constructor (addr)
			{
				const original_struct =
				{
					object_addr: wasm.Addr(addr + Uniform.original_struct_offsets[0]),

					name: wasm.StdString(addr + Uniform.original_struct_offsets[1]),

					block_index: wasm.SizeT(addr + Uniform.original_struct_offsets[2]),
				};

				this.addr = addr;

				this.object_addr = original_struct.object_addr;

				this.name = WasmWrapper.uint8Array2DomString(original_struct.name);

				// uniform block index
				this.block_index = original_struct.block_index;

				this._data = wasm.Charv2(this.object_addr, 16 * 4);

				// LOG(wasm.Charv(this.object_addr, 16 * 4), wasm.Floatv(this.object_addr, 16))

				// LOG(this)
			}
		};

		this.Uniform = Uniform;



		class Material
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports.material_offsets, 9);

			static ENUM =
			{
				TOPOLOGY:
				[
					gl.TRIANGLES, // TRIANGLES
					gl.POINTS, // POINTS
					gl.LINES, // LINES
				],
			};

			static active_material = null;



			constructor (addr)
			{
				const original_struct =
				{
					topology: wasm.SizeT(addr + Material.original_struct_offsets[0]),

					glsl100es_code_vertex: wasm.StdString(addr + Material.original_struct_offsets[1]),

					glsl100es_code_fragment: wasm.StdString(addr + Material.original_struct_offsets[2]),

					glsl300es_code_vertex: wasm.StdString(addr + Material.original_struct_offsets[3]),

					glsl300es_code_fragment: wasm.StdString(addr + Material.original_struct_offsets[4]),

					uniforms: wasm.StdVectorAddr(addr + Material.original_struct_offsets[7]),

					uniform_blocks: wasm.StdVectorAddr(addr + Material.original_struct_offsets[8]),
				};

				this.addr = addr;

				this.topology = Material.ENUM.TOPOLOGY[original_struct.topology];



				this.program = gl.createProgram();



				// vertex
				{
					let code = null;

					if (renderer._context.constructor === WebGLRenderingContext)
					{
						code = WasmWrapper.uint8Array2DomString(original_struct.glsl100es_code_vertex).trim();
					}
					else if (renderer._context.constructor === WebGL2RenderingContext)
					{
						code = WasmWrapper.uint8Array2DomString(original_struct.glsl300es_code_vertex).trim();
					}

					const shader = gl.createShader(gl.VERTEX_SHADER);

					gl.shaderSource(shader, code);

					gl.compileShader(shader);

					if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
					{
						const strOut = `\n${ code.split('\n').map((elm, i) => `${ i + 1 }:${ elm }`).join('\n') }\n`;

						throw new Error(`${ strOut }${ gl.getShaderInfoLog(shader) }`);
					}

					gl.attachShader(this.program, shader);
				}



				// fragment
				{
					let code = null;

					if (renderer._context.constructor === WebGLRenderingContext)
					{
						code = WasmWrapper.uint8Array2DomString(original_struct.glsl100es_code_fragment).trim();
					}
					else if (renderer._context.constructor === WebGL2RenderingContext)
					{
						code = WasmWrapper.uint8Array2DomString(original_struct.glsl300es_code_fragment).trim();
					}

					const shader = gl.createShader(gl.FRAGMENT_SHADER);

					gl.shaderSource(shader, code);

					gl.compileShader(shader);

					if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
					{
						const strOut = `\n${ code.split('\n').map((elm, i) => `${ i + 1 }:${ elm }`).join('\n') }\n`;

						throw new Error(`${ strOut }${ gl.getShaderInfoLog(shader) }`);
					}

					gl.attachShader(this.program, shader);
				}



				gl.linkProgram(this.program);



				gl.useProgram(this.program);

				this.uniforms =
					// TypedArray::map returns TypedArray, but need Array.
					Array.from(original_struct.uniforms)
						.map
						(
							(uniform_addr) =>
							{
								const uniform = new Uniform(uniform_addr);

								uniform.location = gl.getUniformLocation(this.program, uniform.name);

								// Check if shader uses uniform then push uniform to this.uniforms.
								if (uniform.location)
								{
									uniform.update = () =>
									{
										gl.uniformMatrix4fv(uniform.location, false, uniform._data);
									};

									uniform.update();

									return uniform;
								}

								return null;
							},
						)
						.filter((uniform) => uniform);

				gl.useProgram(null);



				if (renderer._context.constructor === WebGL2RenderingContext)
				{
					original_struct.uniform_blocks.forEach
					(
						(uniform_block_addr) =>
						{
							const uniform_block_info = UniformBlock.getInfo(uniform_block_addr);

							gl.uniformBlockBinding
							(
								this.program,
								gl.getUniformBlockIndex(this.program, uniform_block_info.name),
								uniform_block_info.binding,
							);
						},
					);
				}
			}

			// collectObjects ()

			use ()
			{
				Material.active_material = this;

				gl.useProgram(this.program);

				this.uniforms.forEach((uniform) => uniform.update());
			}
		};

		this.Material = Material;



		class UniformBlock
		{
			static original_struct_offsets =
				wasm.SizeTv(wasm.exports._ZN3XGK3API21uniform_block_offsetsE, 3);

			static active_uniform_block = null;

			static getInfo (addr)
			{
				const original_struct =
				{
					binding: wasm.SizeT(addr + UniformBlock.original_struct_offsets[0]),

					name: wasm.StdString(addr + UniformBlock.original_struct_offsets[1]),
				};

				const result =
				{
					binding: original_struct.binding,

					name: WasmWrapper.uint8Array2DomString(original_struct.name),
				};

				return result;
			}



			constructor (addr)
			{
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

							LOG(uniform._data)

							uniform.update = () =>
							{
								gl.bufferSubData(gl.UNIFORM_BUFFER, uniform.block_index * 4, uniform._data);
							};

							buffer_length += uniform._data.length;

							return uniform;
						},
					);

				gl.bufferData(gl.UNIFORM_BUFFER, buffer_length, gl.DYNAMIC_DRAW);

				this.uniforms.forEach((uniform) => uniform.update());

				gl.bindBuffer(gl.UNIFORM_BUFFER, null);
			}

			// collectObjects ()

			use ()
			{
				gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);

				this.uniforms.forEach((uniform) => uniform.update());
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
				gl.drawArrays(Material.active_material.topology, this.scene_vertex_data_offset, this.scene_vertex_data_length);
			}
		};

		this.Object = Object;



		class ObjectIndexed
		{
			// constructor ()

			draw (renderer)
			{
				renderer.context.drawElements(this.topology);
			}
		};

		this.ObjectIndexed = ObjectIndexed;



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

	// collectMaterials ()

	render ()
	{
		this.context.bindBuffer(this.vertex_buffer);
		this.context.bindBuffer(this.vindex_buffer);

		for (let i = 0; i < this.material_count; ++i)
		{
			const material = this.materials[i];

			material.use();

			for (let k = 0; k < material.object_count; ++k)
			{
				const _object = material.objects[i];

				_object.draw();
			}
		}
	}
}
