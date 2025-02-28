import React, { useState } from 'react';
import { Todo } from '../types/Todo';

interface TodoItemProps {
  todo: Todo;
  onUpdate: (id: number, todo: Partial<Todo>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description);

  const handleToggleComplete = () => {
    onUpdate(todo.id, { completed: !todo.completed });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle(todo.title);
    setDescription(todo.description);
  };

  const handleSave = () => {
    onUpdate(todo.id, { title, description });
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(todo.id);
  };

  return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      {isEditing ? (
        <div className="todo-edit">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
          <div className="todo-actions">
            <button onClick={handleSave}>Save</button>
            <button onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="todo-content">
            <h3>{todo.title}</h3>
            <p>{todo.description}</p>
            <div className="todo-meta">
              <span>Created: {new Date(todo.createdAt).toLocaleString()}</span>
              <span>Updated: {new Date(todo.updatedAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="todo-actions">
            <label>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={handleToggleComplete}
              />
              Complete
            </label>
            <button onClick={handleEdit}>Edit</button>
            <button onClick={handleDelete}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
};

export default TodoItem; 