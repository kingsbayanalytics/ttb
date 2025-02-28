import React, { useEffect, useState } from 'react';
import { Todo } from '../types/Todo';
import { TodoService } from '../services/api';
import TodoItem from './TodoItem';
import TodoForm from './TodoForm';

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const data = await TodoService.getAllTodos();
      setTodos(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch todos. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTodo = await TodoService.createTodo(todo);
      setTodos([...todos, newTodo]);
    } catch (err) {
      setError('Failed to add todo. Please try again.');
      console.error(err);
    }
  };

  const handleUpdateTodo = async (id: number, updatedTodo: Partial<Todo>) => {
    try {
      const updated = await TodoService.updateTodo(id, updatedTodo);
      setTodos(todos.map(todo => todo.id === id ? updated : todo));
    } catch (err) {
      setError('Failed to update todo. Please try again.');
      console.error(err);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await TodoService.deleteTodo(id);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err) {
      setError('Failed to delete todo. Please try again.');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Loading todos...</div>;
  }

  return (
    <div className="todo-list">
      <h1>Todo List</h1>
      
      {error && <div className="error">{error}</div>}
      
      <TodoForm onAddTodo={handleAddTodo} />
      
      <div className="todos">
        {todos.length === 0 ? (
          <p>No todos yet. Add one above!</p>
        ) : (
          todos.map(todo => (
            <TodoItem 
              key={todo.id} 
              todo={todo} 
              onUpdate={handleUpdateTodo} 
              onDelete={handleDeleteTodo} 
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TodoList; 