import React from "react";

interface PreloaderProps {
  loading?: boolean; // Make loading prop optional with a default value
}

const Preloader: React.FC<PreloaderProps> = ({ loading = true }) => {
  // Only render if loading is true
  if (!loading) return null;
  
  return (
    <div className="preloader-overlay">
      <img src="/preloader.gif" alt="Loading..." className="preloader-gif" />
    </div>
  );
};

export default Preloader;