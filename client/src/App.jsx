import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/web';
import { Bell, File, Calendar, Database, Send, AlertCircle, CheckCircle, UserRound} from 'lucide-react';
import AnimatedUploadArea from './components/AnimatedUploadArea'; // Import the modified upload component
const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const threeJsContainer = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 300 / 200, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(300, 200);
    threeJsContainer.current.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1, 1.4, 0.1);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x4287f5,
      wireframe: true
    });
    const docMesh = new THREE.Mesh(geometry, material);
    scene.add(docMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    camera.position.z = 3;
    const animate = () => {
      requestAnimationFrame(animate);
      docMesh.rotation.y += 0.01;
      docMesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
      docMesh.position.y = Math.sin(Date.now() * 0.002) * 0.1;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      renderer.dispose();
      if (threeJsContainer.current && renderer.domElement) {
        threeJsContainer.current.removeChild(renderer.domElement);
      }
    };
  }, []);
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const docResponse = await fetch('http://ec2-13-233-110-60.ap-south-1.compute.amazonaws.com:5000/documents');
      if (docResponse.ok) {
        const docData = await docResponse.json();
        setDocuments(docData);
      }
      const reminderResponse = await fetch('http://ec2-13-233-110-60.ap-south-1.compute.amazonaws.com:5000/reminders');
      if (reminderResponse.ok) {
        const reminderData = await reminderResponse.json();
        setNotifications(reminderData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleUploadComplete = (uploadData) => {
    const newDocument = {
      id: uploadData.fileName,
      name: uploadData.fileName,
      expiryDate: uploadData.expiryDate,
      uploadDate: uploadData.uploadDate,
      status: uploadData.status
    };
    
    setDocuments(prevDocs => [newDocument, ...prevDocs]);

    if (uploadData.alertSent) {
      const newNotification = {
        id: Date.now(),
        message: `Document '${uploadData.fileName}' expires on ${uploadData.expiryDate}`,
        type: 'urgent',
        expiryDate: uploadData.expiryDate
      };
      
      setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
    }

    const successNotification = {
      id: `success-${Date.now()}`,
      message: `Document '${uploadData.fileName}' processed successfully`,
      type: 'success'
    };
    
    setNotifications(prevNotifications => [successNotification, ...prevNotifications]);

    setTimeout(() => {
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== successNotification.id)
      );
    }, 5000);
  };

  const toggleNotificationPanel = () => {
    setShowNotificationPanel(!showNotificationPanel);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const parts = dateString.includes('/') 
      ? dateString.split('/') 
      : dateString.split('-');
      
    if (parts.length !== 3) return dateString;

    const day = dateString.includes('/') ? parts[0] : parts[2];
    const month = dateString.includes('/') ? parts[1] : parts[1];
    const year = dateString.includes('/') ? parts[2] : parts[0];
    
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <header className="py-6 px-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <NeonBorderButton>
            <Database className="mr-2" size={20} />
            DocuExtract
          </NeonBorderButton>
        </div>
        <nav className="flex gap-4">
          <NeonBorderButton small onClick={toggleNotificationPanel}>
            <Bell size={16} />
            <span className="ml-1">{notifications.length}</span>
          </NeonBorderButton>
          <NeonBorderButton small>
            Log In 
            < UserRound className='m-1' size={16} />
          </NeonBorderButton>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        {/* Notification Panel */}
        <AnimatePresence>
          {showNotificationPanel && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 rounded-lg border border-blue-500 bg-gray-900 bg-opacity-90"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Notifications</h2>
                <button 
                  onClick={toggleNotificationPanel}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {notifications.length === 0 ? (
                <p className="text-gray-400">No notifications at this time.</p>
              ) : (
                <div className="grid gap-3 max-h-64 overflow-y-auto">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`p-3 rounded-lg border flex items-start gap-3 ${
                        notification.type === 'urgent'
                          ? 'border-red-500 bg-red-500 bg-opacity-10'
                          : notification.type === 'reminder'
                          ? 'border-yellow-500 bg-yellow-500 bg-opacity-10'
                          : 'border-green-500 bg-green-500 bg-opacity-10'
                      }`}
                    >
                      {notification.type === 'urgent' ? (
                        <AlertCircle className="text-red-500 mt-1" size={18} />
                      ) : notification.type === 'reminder' ? (
                        <Bell className="text-yellow-500 mt-1" size={18} />
                      ) : (
                        <CheckCircle className="text-green-500 mt-1" size={18} />
                      )}
                      <p>{notification.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h1 className="text-4xl font-bold mb-6 relative">
              Document
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-600"> Extractor</span>
              <div className="absolute bottom-0 left-0 w-39 h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            </h1>
              
            
            <p className="text-gray-300 mb-8">
              Upload your documents to extract dates and receive automated notifications
            </p>
            
            <div className="mb-12">
              <AnimatedUploadArea onUploadComplete={handleUploadComplete} />
            </div>
            
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Calendar className="mr-2" />
                Upcoming Reminders
              </h2>
              
              {isLoading ? (
                <p className="text-gray-400">Loading reminders...</p>
              ) : notifications.length === 0 ? (
                <p className="text-gray-400">No upcoming reminders at this time.</p>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {notifications
                      .filter(notification => notification.type !== 'success')
                      .slice(0, 5)
                      .map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: 20, opacity: 0 }}
                          className={`p-4 rounded-lg border relative overflow-hidden ${
                            notification.type === 'urgent'
                              ? 'border-red-500 bg-red-500 bg-opacity-10'
                              : 'border-yellow-500 bg-yellow-500 bg-opacity-10'
                          }`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-5"></div>
                          <p>{notification.message}</p>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div className="mb-8 flex justify-center">
              <div ref={threeJsContainer} className="w-64 h-48 border border-blue-500 rounded-lg bg-blue-900 bg-opacity-20"></div>
            </div>
            
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <File className="mr-2" />
                Recent Documents
              </h2>
              
              {isLoading ? (
                <p className="text-gray-400">Loading documents...</p>
              ) : documents.length === 0 ? (
                <p className="text-gray-400">No documents found. Upload your first document!</p>
              ) : (
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {documents.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <DocumentCard document={{
                          ...doc,
                          formattedDate: formatDate(doc.expiryDate)
                        }} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Neon Border Button Component (unchanged from your original)
const NeonBorderButton = ({ children, onClick, small }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const neonStyles = useSpring({
    boxShadow: isHovered
      ? '0 0 5px #4d9aff, 0 0 10px #4d9aff, 0 0 15px #4d9aff'
      : '0 0 0px transparent',
    borderColor: isHovered ? '#4d9aff' : 'rgba(59, 130, 246, 0.5)',
    scale: isHovered ? 1.05 : 1,
    config: { tension: 300, friction: 20 }
  });

  return (
    <animated.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={neonStyles}
      className={`${
        small ? 'text-sm px-3 py-1' : 'px-4 py-2'
      } border rounded-lg bg-black bg-opacity-30 flex items-center transition-all duration-300`}
    >
      {children}
    </animated.button>
  );
};

// Document Card Component (slightly modified from your original)
const DocumentCard = ({ document }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const hoverAnimation = useSpring({
    transform: isHovered ? 'translateY(-5px)' : 'translateY(0px)',
    boxShadow: isHovered
      ? '0 10px 25px -5px rgba(59, 130, 246, 0.5)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    config: { tension: 300, friction: 20 }
  });

  return (
    <animated.div
      style={hoverAnimation}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="p-4 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 relative overflow-hidden"
    >
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-10"></div>
      )}
      
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="mr-3 p-2 bg-blue-500 bg-opacity-20 rounded-lg">
            <File size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium">{document.name}</h3>
            <p className="text-sm text-gray-400">Expires: {document.formattedDate}</p>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded text-xs ${
          document.status === 'Processed' 
            ? 'bg-green-500 bg-opacity-20 text-green-400' 
            : document.status === 'Processing'
            ? 'bg-yellow-500 bg-opacity-20 text-yellow-400'
            : 'bg-gray-500 bg-opacity-20 text-gray-400'
        }`}>
          {document.status}
        </div>
      </div>
      
      {isHovered && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex justify-end space-x-2">
          <NeonBorderButton small>
            <Calendar size={14} className="mr-1" />
            View Dates
          </NeonBorderButton>
          <NeonBorderButton small>
            <Send size={14} className="mr-1" />
            Notify
          </NeonBorderButton>
        </div>
      )}
    </animated.div>
  );
};

export default App;