import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { animated, useSpring } from '@react-spring/web';

const AnimatedUploadArea = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const uploadProgress = useSpring({
    width: isUploading ? '100%' : '0%',
    config: { duration: 2000 }
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFiles = async (file) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('https://ec2-13-233-110-60.ap-south-1.compute.amazonaws.com:5000/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onUploadComplete(data);
      } else {
        console.error('Upload failed:', data.error);
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center relative overflow-hidden group cursor-pointer ${
        dragActive ? 'border-purple-500 bg-blue-500 bg-opacity-10' : 'border-blue-500'
      }`}
      onClick={handleButtonClick}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".pdf,.docx,.txt"
        className="hidden" 
        onChange={handleChange}
      />
      
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
      
      {isUploading && (
        <animated.div
          style={uploadProgress}
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        />
      )}
      
      <motion.div
        animate={{ y: isUploading ? [0, -10, 0] : 0 }}
        transition={{ repeat: isUploading ? Infinity : 0, duration: 1 }}
      >
        <div className="mb-4 flex justify-center">
          <Upload size={40} className="text-blue-400" />
        </div>
        <p className="text-xl mb-2">
          {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-gray-400 text-sm">
          Supported formats: PDF
        </p>
      </motion.div>
    </div>
  );
};

export default AnimatedUploadArea;