export interface IRepository<IdentifierType, ModelType> {
	findAll(): Promise<
		(ModelType & { id: string; createdAt: Date; updatedAt: Date })[]
	>;
	findById(
		id: IdentifierType
	): Promise<
		(ModelType & { id: string; createdAt: Date; updatedAt: Date }) | null
	>;
	create(
		item: ModelType
	): Promise<ModelType & { id: string; createdAt: Date; updatedAt: Date }>;
	update(
		id: IdentifierType,
		item: Partial<ModelType>
	): Promise<ModelType & { id: string; createdAt: Date; updatedAt: Date }>;
	delete(id: IdentifierType): Promise<void>;
	findPaginated(
		query: Partial<ModelType>,
		page: number,
		limit: number
	): Promise<(ModelType & { id: string; createdAt: Date; updatedAt: Date })[]>;
	mapper(
		model: any
	): ModelType & { id: string; createdAt: Date; updatedAt: Date };
}
