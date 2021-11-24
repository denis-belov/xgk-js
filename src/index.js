// import '@babel/polyfill';

// import wasm_code from './cpp/src/entry-wasm32.cpp';



// const ZERO_64 = new Uint8Array(64);



// class Memory
// {
// 	constructor (arraybuffer)
// 	{

// 	}
// }



// window.addEventListener
// (
// 	'load',

// 	async () =>
// 	{
// 		let MEM_UI8 = null;

// 		const wasm_module = await WebAssembly.compile(wasm_code);

// 		const wasm_module_instance =
// 			await WebAssembly.instantiate
// 			(
// 				wasm_module,

// 				{
// 					env:
// 					{
// 						__memory_base: 0,
// 						__table_base: 0,
// 						memory: new WebAssembly.Memory({ initial: 1 }),

// 						sin: Math.sin,
// 						cos: Math.cos,
// 						tan: Math.tan,

// 						memmove (dst, src, len)
// 						{
// 							return (MEM_UI8.copyWithin(dst, src, src + len), dst);
// 						},

// 						memcpy (dst, src, len)
// 						{
// 							return (MEM_UI8.copyWithin(dst, src, src + len), dst);
// 						},

// 						// rename to memnull
// 						zero (dst)
// 						{
// 							MEM_UI8.set(ZERO_64, dst);
// 						},

// 						memset: () => 0,
// 						printf: () => 0,
// 						putchar: () => 0,

// 						_Znwm: () => 0, // new
// 						_ZdlPv: () => 0, // delete
// 						_ZSt20__throw_length_errorPKc: () => 0,
// 						__cxa_atexit: () => 0,

// 						console_log: (x) => LOG('C/C++:', x),
// 					},
// 				},
// 			);

// 		LOG(wasm_module_instance.exports);

// 		MEM_UI8 = new Uint8Array(wasm_module_instance.exports.memory.buffer);

// 		const MEM_F32 = new Float32Array(wasm_module_instance.exports.memory.buffer);
// 		const MEM_UI32 = new Uint32Array(wasm_module_instance.exports.memory.buffer);

// 		const WebGL =
// 		{
// 			Material: class
// 			{
// 				static ENUM =
// 				{
// 					TOPOLOGY:
// 					[
// 						33, // TRIANGLES
// 						34, // POINTS
// 						35, // LINES
// 					],
// 				};

// 				constructor (CPP_material_address)
// 				{
// 					this.topology = WebGL.Material.ENUM.TOPOLOGY[MEM_UI32[(CPP_material_address / 4) + 0]];

// 					this.vertex_shader_code_length = MEM_UI32[(CPP_material_address / 4) + 2];

// 					this.vertex_shader_code =
// 						MEM_UI8.slice
// 						(
// 							MEM_UI32[(CPP_material_address / 4) + 1],

// 							MEM_UI32[(CPP_material_address / 4) + 1] + this.vertex_shader_code_length,
// 						);



// 					const gl = document.createElement('canvas').getContext('webgl');

// 					const shader = gl.createShader(gl.VERTEX_SHADER);

// 					gl.shaderSource(shader, new TextDecoder('utf-8').decode(this.vertex_shader_code));

// 					gl.compileShader(shader);

// 					if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
// 					{
// 						const strOut =
// 							`\n${ new TextDecoder('utf-8').decode(this.vertex_shader_code).split('\n').map((elm, i) => `${ i + 1 }:${ elm }`).join('\n') }\n`;

// 						throw new Error(`${ strOut }${ gl.getShaderInfoLog(shader) }`);
// 					}
// 				}

// 				// collectObjects (cpp_objects)
// 				// {
// 				// 	cpp_objects
// 				// }

// 				use (renderer)
// 				{
// 					renderer.context.useProgram(this.program);
// 				}
// 			},

// 			Object: class
// 			{
// 				// constructor ()
// 				// {}

// 				// draw (renderer)
// 				// {
// 				// 	renderer.context.drawArrays(this.topology, this.scene_vertex_data_offset, this.scene_vertex_data_length);
// 				// }
// 			},

// 			ObjectIndexed: class
// 			{
// 				// constructor ()
// 				// {}

// 				draw (renderer)
// 				{
// 					renderer.context.drawElements(this.topology);
// 				}
// 			},

// 			Renderer: class
// 			{
// 				constructor ()
// 				{
// 					this.materials = [];

// 					this.objects = [];
// 				}

// 				// collectMaterials ()
// 				// {
// 				// 	for (let i = 0; i < CPP_materials.length; ++i)
// 				// 	{
// 				// 		const CPP_material = CPP_materials[i];

// 				// 		const material = new WebGL.Material(CPP_material);

// 				// 		this.materials.push(material);
// 				// 	}
// 				// }

// 				render ()
// 				{
// 					this.context.bindBuffer(this.vertex_buffer);
// 					this.context.bindBuffer(this.vindex_buffer);

// 					for (let i = 0; i < this.material_count; ++i)
// 					{
// 						const material = this.materials[i];

// 						material.use();

// 						for (let k = 0; k < material.object_count; ++k)
// 						{
// 							const _object = material.objects[i];

// 							_object.draw();
// 						}
// 					}
// 				}
// 			},
// 		};

// 		// const mat_test = wasm_module_instance.exports.mat_test.value;
// 		// const a = wasm_module_instance.exports.a.value;
// 		// const b = wasm_module_instance.exports.b.value;
// 		// const testv = wasm_module_instance.exports.testv.value;

// 		// LOG(a, MEM_F32.slice(a / 4))
// 		// LOG(b, MEM_F32.slice(b / 4))

// 		// wasm_module_instance.exports.expand();

// 		const m1 = new WebGL.Material(wasm_module_instance.exports.material1.value);

// 		LOG(m1)

// 		// LOG(MEM_F32);

// 		// LOG(mat_test)

// 		// LOG(MEM_F32.slice(mat_test / 4, (mat_test / 4) + 16));

// 		// const renderer = new WebGL.Renderer();

// 		// renderer.collectMaterials(wasm_module_instance.exports.materials.value);
// 	},
// );
