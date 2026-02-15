import { ProjectRepository } from '../ProjectRepository';

describe('ProjectRepository', () => {
  let repo: ProjectRepository;

  beforeEach(() => {
    repo = new ProjectRepository();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(repo).toBeDefined();
    });
  });

  describe('create', () => {
    it('should have create method', () => {
      expect(typeof repo.create).toBe('function');
    });
  });

  describe('get', () => {
    it('should have get method', () => {
      expect(typeof repo.get).toBe('function');
    });
  });

  describe('list', () => {
    it('should have list method', () => {
      expect(typeof repo.list).toBe('function');
    });
  });

  describe('update', () => {
    it('should have update method', () => {
      expect(typeof repo.update).toBe('function');
    });
  });

  describe('delete', () => {
    it('should have delete method', () => {
      expect(typeof repo.delete).toBe('function');
    });
  });
});
