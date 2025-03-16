import { nanoid } from 'nanoid';

class HLC {
	clientId: string;
	count: number;
	unixTimestamp: number;

	constructor(physicalTime: number, logicalTime: number, clientId: string) {
		this.unixTimestamp = physicalTime;
		this.count = logicalTime;
		this.clientId = clientId;
	}

	static fromString(value: string) {
		const [physicalTime, logicalTime, clientId] = value.split('-', 3);
		if (clientId === undefined) {
			throw new Error(`Invalid HLC value: ${value}`);
		}
		return new HLC(parseInt(physicalTime, 10), parseInt(logicalTime, 36), clientId);
	}

	static generate(clientId?: string) {
		return new HLC(0, 0, clientId ?? nanoid());
	}

	cmp(other: HLC) {
		if (this.unixTimestamp < other.unixTimestamp) {
			return -1;
		} else if (this.unixTimestamp > other.unixTimestamp) {
			return 1;
		} else if (this.count < other.count) {
			return -1;
		} else if (this.count > other.count) {
			return 1;
		} else {
			return this.clientId.localeCompare(other.clientId);
		}
	}

	increment() {
		const now = Date.now();
		if (this.unixTimestamp < now) {
			this.unixTimestamp = now;
			this.count = 0;
		} else {
			this.count++;
		}
		return this;
	}

	receive(other: HLC | string) {
		if (typeof other === 'string') {
			other = HLC.fromString(other);
		}
		const now = Date.now();
		const physicalTime = Math.max(this.unixTimestamp, other.unixTimestamp, now);
		if (physicalTime === this.unixTimestamp) {
			this.count = this.count + 1;
		} else if (physicalTime === other.unixTimestamp) {
			this.count = other.count + 1;
		} else {
			this.count = 0;
		}
		this.unixTimestamp = physicalTime;
		return this;
	}

	toString() {
		return `${this.unixTimestamp.toString().padStart(15, '0')}-${this.count.toString(36).padStart(5, '0')}-${this.clientId}`;
	}
}

export { HLC };
