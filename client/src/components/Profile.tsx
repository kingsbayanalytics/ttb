import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { AuthService } from '../services/api';

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user
    const currentUser = AuthService.getCurrentUser();
    
    // Redirect to login if not authenticated
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    setUser(currentUser);
    setUsername(currentUser.username);
    setEmail(currentUser.email);
    setLoading(false);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);
      
      // Prepare update data
      const updateData: Partial<User> = {};
      
      if (username !== user?.username) {
        updateData.username = username;
      }
      
      if (email !== user?.email) {
        updateData.email = email;
      }
      
      if (password) {
        (updateData as any).password = password;
      }
      
      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        const updatedUser = await AuthService.updateUserProfile(updateData);
        setUser(updatedUser);
        
        // Update stored user data
        localStorage.setItem('userData', JSON.stringify(updatedUser));
        
        setSuccess('Profile updated successfully');
      } else {
        setSuccess('No changes to update');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
      console.error(err);
    } finally {
      setUpdating(false);
      // Clear passwords
      setPassword('');
      setConfirmPassword('');
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={updating}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={updating}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">New Password (leave blank to keep current)</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            disabled={updating}
            minLength={6}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={updating || !password}
          />
        </div>
        
        <button 
          type="submit" 
          className="primary-button"
          disabled={updating}
        >
          {updating ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
      
      <div className="account-stats">
        <h3>Account Information</h3>
        <p>Member since: {user && new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default Profile; 