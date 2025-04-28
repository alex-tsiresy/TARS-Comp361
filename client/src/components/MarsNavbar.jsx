import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/MarsNavbar.css';
import { useRobots } from '../context/RobotContext';

const MarsNavbar = () => {
  const { robots } = useRobots();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");
  const [saveStep, setSaveStep] = useState(0);
  const [message, setMessage] = useState('');
  const [successStep, setSuccessStep] = useState(false);

  // Within MarsNavbar.jsx – update your handleSaveProgress function
  const handleSaveProgress = async () => {
    // Clear missionRestarted flag if set
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem("token");
      
      if (!token) {
        setMessage("You need to be logged in to save progress.");
        setSuccessStep(true);
        setTimeout(() => {
          setSuccessStep(false);
          setSaveStep(0);
        }, 1500);
        return;
      }
      
      // Decode token to get the user ID
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userId = tokenPayload.id;
      
      // Delete all existing progress first
      const deleteResponse = await fetch(`${API_URL}/api/progress/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!deleteResponse.ok) {
        console.error("Failed to delete existing progress:", deleteResponse.statusText);
        setMessage("Failed to clear existing progress. Please try again.");
        setSuccessStep(true);
        setTimeout(() => {
          setSuccessStep(false);
          setSaveStep(0);
        }, 1500);
        return;
      }
      
      console.log("Successfully deleted all existing progress");
      
      const missionRestarted = localStorage.getItem("missionRestarted") === "true";

      // If there are no robots, finish here
      if (!robots || robots.length === 0) {
        setMessage(missionRestarted ? "Mission restarted successfully." : "All progress cleared successfully. No robots on map.");
        setSuccessStep(true);
        setTimeout(() => {
          setSuccessStep(false);
          setSaveStep(0);
          localStorage.removeItem("missionRestarted");
        }, 1500);
        return;
      }
      
      // Build an array of progress objects for all robots
      const progressArray = robots.map(robot => ({
        robotId: robot.id,
        position: robot.position,
        height: robot.height,
        coordinates: robot.coordinates,
        behaviorGoal: robot.behaviorGoal || 'random',
        speed: robot.speed || 0.5,
        capabilities: robot.capabilities || {
          maxSpeed: 0.5,
          sensorRange: 100,
          turnRate: 0.05,
          batteryCapacity: 100,
          batteryLevel: 100
        }
      }));
      
      // POST the entire progress array in one request.
      // (Your new progressController should be updated to check for an array in req.body.progress)
      const saveResponse = await fetch(`${API_URL}/api/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progress: progressArray })
      });
      
      if (!saveResponse.ok) {
        console.error("Failed to save progress");
        setMessage("Failed to save progress. Please try again.");
        setSuccessStep(true);
        setTimeout(() => {
          setSuccessStep(false);
          setSaveStep(0);
        }, 1500);
        return;
      }
       
      setMessage("Progress saved successfully!");
      setSuccessStep(true);
      setTimeout(() => {
        setSuccessStep(false);
        setSaveStep(0);
      }, 1500);
    } catch (error) {
      console.error("Error saving progress:", error);
      setMessage("Failed to save progress. Please try again.");
      setSuccessStep(true);
      setTimeout(() => {
        setSuccessStep(false);
        setSaveStep(0);
      }, 1500);
    }
  };

  const startSaveProcess = () => {
    setSaveStep(1);
  };

  const cancelSave = () => {
    setSaveStep(0);
  };

  const handleRestartMission = () => {
    setShowConfirmDialog(true);
  };

  const confirmRestartMission = async () => {
      // Clear all mission-related state from localStorage
      localStorage.removeItem("missionState");
      localStorage.removeItem("selectedRobot");
      localStorage.removeItem("robotCapabilities");
      localStorage.removeItem("robotTasks");
      
      // Set the missionRestarted flag
      localStorage.setItem("missionRestarted", "true");
      
      // Force a complete page reload to reset all state
      window.location.href = window.location.origin + window.location.pathname;
  };

  const cancelRestartMission = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <nav className="mars-navbar">
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/play" className="nav-link">Mission Control</Link>
          <Link to="/info" className="nav-link">Protocol Manual</Link>
          {isLoggedIn && (
            <button className="nav-link" onClick={startSaveProcess}>
              Save Progress
            </button>
          )}
          <button className="nav-link" onClick={handleRestartMission}>
            Restart Mission
          </button>
        </div>
      </nav>

      {saveStep === 1 && !successStep && (
        <div className="login-modal">
          <div className="logout-content">
            <h3>Do you want to save your progress?</h3>
            <button className="save-button" onClick={handleSaveProgress}>Save Progress</button>
            <button className="cancel-button" onClick={cancelSave}>Cancel</button>
          </div>
        </div>
      )}

      {successStep && (
        <div className="login-modal">
          <div className="logout-content">
            <h3>{message}</h3>
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="confirm-dialog">
          <div className="confirm-content">
            <h3>Restart Mission</h3>
            <p>Are you sure you want to restart the mission? This will delete all your progress and reset all robots.</p>
            <div className="confirm-buttons">
              <button className="confirm-button" onClick={confirmRestartMission}>Confirm</button>
              <button className="cancel-button" onClick={cancelRestartMission}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarsNavbar; 