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



	// constructor ()
	// {}
}
