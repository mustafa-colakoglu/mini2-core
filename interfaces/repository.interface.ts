// Standard timestamp fields for entities
export interface TimestampFields {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

// Generic repository interface for data access layer
export interface IRepository<IdentifierType, ModelType> {
	findAll(): Promise<(ModelType & TimestampFields)[]>;
	findById(id: IdentifierType): Promise<(ModelType & TimestampFields) | null>;
	create(item: ModelType): Promise<ModelType & TimestampFields>;
	update(
		id: IdentifierType,
		item: Partial<ModelType>
	): Promise<ModelType & TimestampFields>;
	delete(id: IdentifierType): Promise<void>;
	findPaginated(
		query: Partial<ModelType>,
		page: number,
		limit: number
	): Promise<(ModelType & TimestampFields)[]>;
}
