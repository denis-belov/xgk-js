export default class Base
{
	static instances = null;

	static getInstance (addr)
	{
		if (!this.instances)
		{
			this.instances = {};
		}

		if (!this.instances[addr])
		{
			Object.defineProperty
			(
				this.instances,

				addr,

				{ value: new this(addr) },
			)
		}

		return this.instances[addr];
	}

	static _getOriginalStruct (descriptor, offsets, wasm_wrapper_instance, addr)
	{
		const original_struct = {};

		let member_index = 0;

		for (const member_name in descriptor)
		{
			const type = descriptor[member_name];

			original_struct[member_name] = wasm_wrapper_instance[type](addr + offsets[member_index]);

			++member_index;
		}

		return original_struct;
	}

	static getOriginalStruct (addr)
	{
		const original_struct =
			Base._getOriginalStruct
			(
				this.original_struct_descriptor,
				this.original_struct_offsets,
				wasm_wrapper,
				addr,
			);

		return original_struct;
	}



	constructor (addr)
	{
		this.addr = addr;
	}
}
