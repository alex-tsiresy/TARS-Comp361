import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL; // Make sure your .env file has this

// Fetch all available terrain images from the database
export const getTerrainImages = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/terrain-images`);
    return response;
  } catch (error) {
    console.error('Error fetching terrain images:', error);
    throw error;
  }
};

// Upload a new terrain image
export const uploadTerrainImage = async (imageData) => {
  try {
    const response = await axios.post(`${API_URL}/api/terrain-images`, imageData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  } catch (error) {
    console.error('Error uploading terrain image:', error);
    throw error;
  }
};

// Update an existing terrain image by its id
export const updateTerrainImage = async (id, imageData) => {
  try {
    const response = await axios.put(`${API_URL}/api/terrain-images/${id}`, imageData);
    return response;
  } catch (error) {
    console.error('Error updating terrain image:', error);
    throw error;
  }
};

// Delete a terrain image by its id
export const deleteTerrainImage = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/api/terrain-images/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting terrain image:', error);
    throw error;
  }
};