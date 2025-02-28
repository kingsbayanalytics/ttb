import axios from 'axios';
import { Todo } from '../types/Todo';

const API_URL = 'http://localhost:5000/api';

export const TodoService = {
  // Get all todos
  getAllTodos: async (): Promise<Todo[]> => {
    const response = await axios.get(`${API_URL}/todos`);
    return response.data;
  },

  // Get a single todo by ID
  getTodoById: async (id: number): Promise<Todo> => {
    const response = await axios.get(`${API_URL}/todos/${id}`);
    return response.data;
  },

  // Create a new todo
  createTodo: async (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> => {
    const response = await axios.post(`${API_URL}/todos`, todo);
    return response.data;
  },

  // Update an existing todo
  updateTodo: async (id: number, todo: Partial<Todo>): Promise<Todo> => {
    const response = await axios.put(`${API_URL}/todos/${id}`, todo);
    return response.data;
  },

  // Delete a todo
  deleteTodo: async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/todos/${id}`);
  }
}; 