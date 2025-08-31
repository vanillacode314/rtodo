import { nanoid } from 'nanoid';

class HLC {
	clientId: string;
	logicalTime: number;
	physicalTime: number;

	constructor(physicalTime: number, logicalTime: number, clientId: string) {
		this.physicalTime = physicalTime;
		this.logicalTime = logicalTime;
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
		if (this.physicalTime < other.physicalTime) {
			return -1;
		} else if (this.physicalTime > other.physicalTime) {
			return 1;
		} else if (this.logicalTime < other.logicalTime) {
			return -1;
		} else if (this.logicalTime > other.logicalTime) {
			return 1;
		} else {
			return this.clientId.localeCompare(other.clientId);
		}
	}

	increment() {
		const now = Date.now();
		if (this.physicalTime < now) {
			this.physicalTime = now;
			this.logicalTime = 0;
		} else {
			this.logicalTime++;
		}
		return this;
	}

	receive(other: HLC | string) {
		if (typeof other === 'string') {
			other = HLC.fromString(other);
		}
		const now = Date.now();
		const physicalTime = Math.max(this.physicalTime, other.physicalTime, now);
		if (physicalTime === this.physicalTime) {
			this.logicalTime = this.logicalTime + 1;
		} else if (physicalTime === other.physicalTime) {
			this.logicalTime = other.logicalTime + 1;
		} else {
			this.logicalTime = 0;
		}
		this.physicalTime = physicalTime;
		return this;
	}

	toString() {
		return `${this.physicalTime.toString().padStart(15, '0')}-${this.logicalTime.toString(36).padStart(5, '0')}-${this.clientId}`;
	}
}

export { HLC };
