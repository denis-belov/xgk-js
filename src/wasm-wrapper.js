/**
 * Using TypedArray.subarray() is preferred
 * when accessing to non-scalar data (like arrays)
 * to avoid extra memory allocation.
 *
 * Strange std::string behavior:
 * if std::string data length <=11, std::string object address is the same with its data;
 * if >11, std::string object name stores address of beginning of the data.
 * So in second case one can use WasmWrapper::Charv method to get string bytes.
 * Maybe it's not related to data length, but to dynamic memory allocation.
 *
 *
 *
 * TODO: determination capabiity of what wasm memory type is being used.
 * TODO: Rename SizeT to Size.
 */



const IDLE_FUNCTION = () => 0;



export default class WasmWrapper
{
	static PTR_SIZE = 4;

	static text_decoder = new TextDecoder('utf-8');

	// static uint8Array2DomString (uint8_array)
	// {
	// 	return WasmWrapper.text_decoder.decode(uint8_array);
	// }

	static uint8Array2DomString (uint8_array)
	{
		return WasmWrapper.text_decoder.decode(new Uint8Array(uint8_array));
	}

	constructor ()
	{
		this.mem =
		{
			UI8: null,
			UI32: null,
			UI64: null,
			F32: null,
		};
	}

	Addr (addr, offset = 0)
	{
		return this.mem.UI32[(addr + (offset * WasmWrapper.PTR_SIZE)) / 4];
	}

	Addrv (addr, length, offset = 0)
	{
		const _addr = (addr + (offset * WasmWrapper.PTR_SIZE)) / 4;

		return this.mem.UI32.subarray(_addr, _addr + length);
	}

	Uint32 (addr, offset = 0)
	{
		return this.mem.UI32[(addr + (offset * WasmWrapper.PTR_SIZE)) / 4];
	}

	Uint32v (addr, length, offset = 0)
	{
		const _addr = (addr + (offset * WasmWrapper.PTR_SIZE)) / 4;

		return this.mem.UI32.subarray(_addr, _addr + length);
	}

	Char (addr, offset = 0)
	{
		return this.mem.UI8[addr + (offset * WasmWrapper.PTR_SIZE)];
	}

	CharvLen (addr, offset = 0)
	{
		const _addr = addr + (offset * WasmWrapper.PTR_SIZE);

		for (let vend = 0; ; ++vend)
		{
			if (this.Char(_addr + vend) === 0)
			{
				return vend;
			}
		}
	}

	Charv (addr, offset = 0)
	{
		return this.mem.UI8.subarray
		(addr + (offset * WasmWrapper.PTR_SIZE), addr + (offset * WasmWrapper.PTR_SIZE) + this.CharvLen(addr, offset));
	}

	Charv2 (addr, length, offset = 0)
	{
		return this.mem.UI8.subarray
		(addr + (offset * WasmWrapper.PTR_SIZE), addr + (offset * WasmWrapper.PTR_SIZE) + length);
	}

	SizeT (addr, offset = 0)
	{
		return this.mem.UI32[(addr + (offset * WasmWrapper.PTR_SIZE)) / 4];
	}

	SizeTv (addr, length, offset = 0)
	{
		const _addr = (addr + (offset * WasmWrapper.PTR_SIZE)) / 4;

		return this.mem.UI32.subarray(_addr, _addr + length);
	}

	Float (addr, offset = 0)
	{
		return this.mem.F32[(addr + (offset * WasmWrapper.PTR_SIZE)) / 4];
	}

	Floatv (addr, length, offset = 0)
	{
		const _addr = (addr + (offset * WasmWrapper.PTR_SIZE)) / 4;

		return this.mem.F32.subarray(_addr, _addr + length);
	}

	StdString (addr, offset = 0)
	{
		/**
		 * 	These funcions must to be defined:

		 *	extern "C" void* getStdStringData (std::string& s)
		 *	{
		 *		return s.data();
		 *	}
		 *
		 *	extern "C" std::size_t getStdStringSize (std::string& s)
		 *	{
		 *		return s.size();
		 *	}
		 */

		const _addr = addr + (offset * WasmWrapper.PTR_SIZE);

		const result =
			this.Charv2
			(
				this.exports.getStdStringData(_addr),

				this.exports.getStdStringSize(_addr),
			);

		return result;
	}

	StdVectorUint32 (addr, offset = 0)
	{
		/**
		 * 	These funcions must to be defined:

		 *	extern "C" void* getStdVectorDataUint32 (std::vector<uint32_t>& v)
		 *	{
		 *		return v.data();
		 *	}
		 *
		 *	extern "C" std::size_t getStdVectorSizeUint32 (std::vector<uint32_t>& v)
		 *	{
		 *		return v.size();
		 *	}
		 */

		const _addr = addr + (offset * WasmWrapper.PTR_SIZE);

		const result =
			this.Uint32v
			(
				this.exports.getStdVectorDataUint32(_addr),

				this.exports.getStdVectorSizeUint32(_addr),
			);

		return result;
	}

	StdVectorFloat (addr, offset = 0)
	{
		/**
		 * 	These funcions must to be defined:

		 *	extern "C" void* getStdVectorDataFloat (std::vector<float>& v)
		 *	{
		 *		return v.data();
		 *	}
		 *
		 *	extern "C" std::size_t getStdVectorSizeFloat (std::vector<float>& v)
		 *	{
		 *		return v.size();
		 *	}
		 */

		const _addr = addr + (offset * WasmWrapper.PTR_SIZE);

		const result =
			this.Floatv
			(
				this.exports.getStdVectorDataFloat(_addr),

				this.exports.getStdVectorSizeFloat(_addr),
			);

		return result;
	}

	StdVectorAddr (addr, offset = 0)
	{
		/**
		 * 	These funcions must to be defined:

		 *	extern "C" void* getStdVectorDataFloat (std::vector<void*>& v)
		 *	{
		 *		return v.data();
		 *	}
		 *
		 *	extern "C" std::size_t getStdVectorSizeFloat (std::vector<void*>& v)
		 *	{
		 *		return v.size();
		 *	}
		 */

		const _addr = addr + (offset * WasmWrapper.PTR_SIZE);

		const result =
			this.Addrv
			(
				this.exports.getStdVectorDataAddr(_addr),

				this.exports.getStdVectorSizeAddr(_addr),
			);

		return result;
	}

	async mod (wasm_module, memory, custom_imports)
	{
		const wasm_module_instance =
			await WebAssembly.instantiate
			// await WebAssembly.instantiateStreaming
			(
				wasm_module,

				{
					js: { mem: memory },

					env:
						Object.assign
						(
							{
								__memory_base: 0,
								__table_base: 0,
								// memory,
								__multi3: IDLE_FUNCTION,
								console_log: (x) => LOG('C/C++:', x),
								console_log_f: (x) => LOG('C/C++:', x),
								date_now: () => Date.now(),
							},

							custom_imports,
						),

					// TODO: learn what is wasi_snapshot_preview1.
					wasi_snapshot_preview1:
					{
						fd_seek: IDLE_FUNCTION,
						fd_write: IDLE_FUNCTION,
						fd_close: IDLE_FUNCTION,
						fd_fdstat_get: IDLE_FUNCTION,
						proc_exit: IDLE_FUNCTION,

						clock_time_get: IDLE_FUNCTION,
					},
				},
			);

		this.exports = wasm_module_instance.exports;

		// this.memory.grow(100);

		const { buffer } = this.exports.memory;

		this.mem.UI8 = new Uint8Array(buffer);
		this.mem.UI32 = new Uint32Array(buffer);
		this.mem.F32 = new Float32Array(buffer);
	}

	async init (code, memory, custom_imports)
	{
		const wasm_module = await WebAssembly.compile(code);

		LOG(wasm_module)

		// this.module = wasm_module;

		const wasm_module_instance =
			await WebAssembly.instantiate
			// await WebAssembly.instantiateStreaming
			(
				wasm_module,

				{
					env:
						Object.assign
						(
							{
								__memory_base: 0,
								__table_base: 0,
								// memory: this.memory,
								memory,
								// memory: memory ? null : this.memory,

								// sin: Math.sin,
								// cos: Math.cos,
								// tan: Math.tan,

								// memmove (dst, src, len)
								// {
								// 	return (_this.mem.UI8.copyWithin(dst, src, src + len), dst);
								// },

								// memcpy (dst, src, len)
								// {
								// 	return (_this.mem.UI8.copyWithin(dst, src, src + len), dst);
								// },

								// // rename to memnull
								// zero (dst)
								// {
								// 	_this.mem.UI8.set(ZERO_64, dst);
								// },

								// // new
								// // Need to be hardly refined!
								// _Znwm (allocated_byte_count)
								// {
								// 	const result = _this.exports.__heap_base + _this.heap_ptr;

								// 	LOG('new', result, allocated_byte_count, _this.heap_ptr)

								// 	_this.heap_ptr += allocated_byte_count;

								// 	return result;
								// },

								// memset: IDLE_FUNCTION,
								// printf: IDLE_FUNCTION,
								// putchar: IDLE_FUNCTION,

								// _ZdlPv: IDLE_FUNCTION, // delete
								// _ZSt20__throw_length_errorPKc: IDLE_FUNCTION,
								// _ZSt17__throw_bad_allocv: () => LOG('_ZSt17__throw_bad_allocv'),
								// __cxa_atexit: IDLE_FUNCTION,

								__multi3: IDLE_FUNCTION,
								console_log: (x) => LOG('C/C++:', x),
								console_log_f: (x) => LOG('C/C++:', x),
								date_now: () => Date.now(),
							},

							custom_imports,
						),

					// TODO: learn what is wasi_snapshot_preview1.
					wasi_snapshot_preview1:
					{
						fd_seek: IDLE_FUNCTION,
						fd_write: IDLE_FUNCTION,
						fd_close: IDLE_FUNCTION,
						fd_fdstat_get: IDLE_FUNCTION,
						fd_advise: IDLE_FUNCTION,
						fd_allocate: IDLE_FUNCTION,
						fd_datasync: IDLE_FUNCTION,
						fd_fdstat_set_flags: IDLE_FUNCTION,
						fd_fdstat_set_rights: IDLE_FUNCTION,
						fd_filestat_get: IDLE_FUNCTION,
						fd_filestat_set_size: IDLE_FUNCTION,
						fd_filestat_set_times: IDLE_FUNCTION,
						fd_pread: IDLE_FUNCTION,
						fd_prestat_get: IDLE_FUNCTION,
						fd_prestat_dir_name: IDLE_FUNCTION,
						fd_pwrite: IDLE_FUNCTION,
						fd_read: IDLE_FUNCTION,
						fd_readdir: IDLE_FUNCTION,
						fd_renumber: IDLE_FUNCTION,
						fd_sync: IDLE_FUNCTION,
						fd_tell: IDLE_FUNCTION,

						path_create_directory: IDLE_FUNCTION,
						path_filestat_get: IDLE_FUNCTION,
						path_filestat_set_times: IDLE_FUNCTION,
						path_link: IDLE_FUNCTION,
						path_open: IDLE_FUNCTION,
						path_readlink: IDLE_FUNCTION,
						path_remove_directory: IDLE_FUNCTION,
						path_rename: IDLE_FUNCTION,
						path_symlink: IDLE_FUNCTION,
						path_unlink_file: IDLE_FUNCTION,
						poll_oneoff: IDLE_FUNCTION,
						proc_raise: IDLE_FUNCTION,
						sched_yield: IDLE_FUNCTION,
						random_get: IDLE_FUNCTION,
						sock_recv: IDLE_FUNCTION,
						sock_send: IDLE_FUNCTION,
						sock_shutdown: IDLE_FUNCTION,

						proc_exit: IDLE_FUNCTION,

						clock_time_get: IDLE_FUNCTION,

						args_get: IDLE_FUNCTION,
						args_sizes_get: IDLE_FUNCTION,
						environ_get: IDLE_FUNCTION,
						environ_sizes_get: IDLE_FUNCTION,
						clock_res_get: IDLE_FUNCTION,
					},
				},
			);

		LOG(wasm_module_instance);

		this.exports = wasm_module_instance.exports;

		// this.memory.grow(100);

		// const { buffer } = this.exports.memory;
		const { buffer } = memory;

		this.mem.UI8 = new Uint8Array(buffer);
		this.mem.UI32 = new Uint32Array(buffer);
		this.mem.F32 = new Float32Array(buffer);
	}
}
