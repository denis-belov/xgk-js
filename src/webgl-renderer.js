import Base from './base';



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

				this.buffer = gl.createBuffer();

				gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
				gl.bindBufferBase(gl.UNIFORM_BUFFER, this.binding, this.buffer);
				gl.bufferData(gl.UNIFORM_BUFFER, this.buffer_length, gl.DYNAMIC_DRAW);

				// Initially update uniforms.
				this.use();

				gl.bindBuffer(gl.UNIFORM_BUFFER, null);
			}

			use ()
			{
				gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);

				for
				(
					let uniform_index = 0;
					uniform_index < this.uniforms.length;
					++uniform_index
				)
				{
					const uniform = this.uniforms[uniform_index];

					gl.bufferSubData(gl.UNIFORM_BUFFER, uniform.block_index, uniform._data);
				}
			}
		};

		this.UniformBlock = UniformBlock;



		class Material extends Base
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

			static used_instance = null;



			constructor (addr)
			{
				super(addr);

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
										gl.uniformMatrix4fv(uniform.location, false, uniform.typed_data);
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
							const uniform_block_info = UniformBlock.getInstance(uniform_block_addr);

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

			use ()
			{
				Material.used_instance = this;

				gl.useProgram(this.program);

				this.uniforms.forEach((uniform) => uniform.update());
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
				gl.drawArrays(Material.used_instance.topology, this.scene_vertex_data_offset, this.scene_vertex_data_length);
			}
		};

		this.Object = _Object;



		class ObjectIndexed extends Base
		{
			constructor (addr)
			{
				super(addr);
			}

			draw (renderer)
			{
				renderer.context.drawElements(this.topology);
			}
		};

		this.ObjectIndexed = ObjectIndexed;



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
