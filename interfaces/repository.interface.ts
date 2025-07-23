// Generic repository interface for data access layer
export interface IRepository<IdentifierType, ModelType> {
	findAll(): Promise<ModelType[]>;
	findById(id: IdentifierType): Promise<ModelType | null>;
	create(item: ModelType): Promise<ModelType>;
	update(id: IdentifierType, item: Partial<ModelType>): Promise<ModelType>;
	delete(id: IdentifierType): Promise<void>;
	findPaginated(
		query: Partial<ModelType>,
		page: number,
		limit: number
	): Promise<ModelType[]>;
}
