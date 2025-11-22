
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Car, MapPin, Sparkles, Navigation2, Clock, ShieldCheck, Menu, X, LogOut, History, ChevronLeft, CheckCircle2, AlertCircle, Map as MapIcon, MessageCircle, Bell } from 'lucide-react';
import { ViewState, RideRequest, AiRouteInsight, DriverStatus, User, Location, ChatMessage } from './types';
import Map from './components/Map';
import Auth from './components/Auth';
import KYC from './components/KYC';
import Chat from './components/Chat';
import { Button, Input, Card, Badge } from './components/ui';
import { getRouteInsight } from './services/geminiService';
import { getCurrentUser, logout, updateUserProfile, verifyMagicLink } from './services/authService';
import { supabase } from './lib/supabase';
import { getRideHistory, saveRideToHistory } from './services/historyService';

// Simple pleasant notification chime (Base64 MP3)
const NOTIFICATION_CHIME = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [pendingView, setPendingView] = useState<ViewState | null>(null);

  const [view, setView] = useState<ViewState>('landing');
  const [menuOpen, setMenuOpen] = useState(false);

  // Location State
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Shared State
  const [showHistory, setShowHistory] = useState(false);
  const [rideHistory, setRideHistory] = useState<RideRequest[]>([]);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null); // Unified active ride state for both
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Rider State
  const [destination, setDestination] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeInsight, setRouteInsight] = useState<AiRouteInsight | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const rideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Driver State
  const [driverStatus, setDriverStatus] = useState<DriverStatus>(DriverStatus.OFFLINE);
  const [incomingRequests, setIncomingRequests] = useState<RideRequest[]>([]);
  const [showNewRequestAlert, setShowNewRequestAlert] = useState(false);
  
  // Audio & Notification Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevRequestCount = useRef(0);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_CHIME);
    audioRef.current.volume = 0.7;
  }, []);

  // Get Geolocation on Mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Could not get location");
          // Default fallback (Manila)
          setUserLocation({ lat: 14.5995, lng: 120.9842 });
        }
      );
    } else {
      setLocationError("Geolocation not supported");
      setUserLocation({ lat: 14.5995, lng: 120.9842 });
    }
  }, []);

  // Check for existing session and role on mount
  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setRideHistory(getRideHistory(currentUser.id));
        
        // Role based routing
        if (currentUser.role) {
          if (currentUser.role === 'driver' && !currentUser.isVerified) {
            setView('kyc');
          } else {
            setView(currentUser.role as ViewState);
          }
        }
      }
    };
    
    initAuth();
  }, []);

  // Handle Supabase auth state changes and redirect callbacks
  useEffect(() => {
    // Check for auth callback in URL (handles magic link redirect)
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');
      
      if (error) {
        console.error('Auth error:', error);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (accessToken) {
        // Verify the session and get user
        try {
          const user = await verifyMagicLink();
          if (user) {
            // Use handleLogin to properly handle routing and pending views
            handleLogin(user);
            setRideHistory(getRideHistory(user.id));
          }
        } catch (error) {
          console.error('Error verifying auth callback:', error);
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleAuthCallback();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          const user = await verifyMagicLink();
          if (user) {
            handleLogin(user);
            setRideHistory(getRideHistory(user.id));
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setView('landing');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update history when user changes or view toggles
  useEffect(() => {
    if (user && showHistory) {
      setRideHistory(getRideHistory(user.id));
    }
  }, [user, showHistory]);

  // Clear chat when ride ends
  useEffect(() => {
    if (!activeRide) {
      setChatMessages([]);
      setIsChatOpen(false);
    }
  }, [activeRide]);

  // DRIVER NOTIFICATION LOGIC
  useEffect(() => {
    if (view !== 'driver') return;

    // If requests increased
    if (incomingRequests.length > prevRequestCount.current) {
        if (driverStatus === DriverStatus.AVAILABLE) {
            // 1. Play Sound
            audioRef.current?.play().catch(e => console.log("Audio play prevented by browser interaction policy", e));
            
            // 2. Show visual alert in app
            setShowNewRequestAlert(true);
            setTimeout(() => setShowNewRequestAlert(false), 3000);

            // 3. Update Tab Title
            document.title = `(${incomingRequests.length}) New Ride Request!`;
        }
    } else if (incomingRequests.length === 0) {
        document.title = "Triip";
    }

    prevRequestCount.current = incomingRequests.length;
  }, [incomingRequests, view, driverStatus]);


  // Handle view navigation with Auth Guard
  const handleModeSelect = async (selectedRole: 'rider' | 'driver') => {
    if (!user) {
      setPendingView(selectedRole);
      setShowAuth(true);
    } else {
      if (user.role && user.role !== selectedRole) {
        alert(`You are already registered as a ${user.role}`);
        return;
      }

      if (!user.role) {
         const updatedUser = await updateUserProfile({ role: selectedRole });
         if (updatedUser) setUser(updatedUser);
      }

      if (selectedRole === 'driver' && !user.isVerified) {
        setView('kyc');
      } else if (selectedRole === 'rider' && !user.isVerified) {
        setView('kyc'); 
      } else {
        setView(selectedRole);
      }
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setShowAuth(false);
    
    if (loggedInUser.role) {
       if (loggedInUser.role === 'driver' && !loggedInUser.isVerified) {
         setView('kyc');
       } else {
         setView(loggedInUser.role as ViewState);
       }
    } else if (pendingView && pendingView !== 'landing') {
       if (pendingView === 'rider' || pendingView === 'driver') {
           handleModeSelect(pendingView as 'rider' | 'driver');
       }
    }
    setPendingView(null);
  };

  const handleKYCComplete = async (updates: Partial<User>) => {
    const updatedUser = await updateUserProfile(updates);
    if (updatedUser) {
       setUser(updatedUser);
       setView(updatedUser.role as ViewState);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setView('landing');
    setMenuOpen(false);
    setRideHistory([]);
    setRouteInsight(null);
    setActiveRide(null);
    setDestination('');
    if (rideTimerRef.current) clearTimeout(rideTimerRef.current);
    setRequestSent(false);
    setIncomingRequests([]);
    setDriverStatus(DriverStatus.OFFLINE);
  };

  // Simulate incoming requests for driver
  useEffect(() => {
    if (view === 'driver' && driverStatus === DriverStatus.AVAILABLE && !activeRide && userLocation) {
      const interval = setInterval(() => {
        if (Math.random() > 0.7 && incomingRequests.length < 3) {
          const newReq: RideRequest = {
            id: Date.now().toString(),
            passengerName: ['Maria', 'Juan', 'Jose', 'Ana', 'Miguel'][Math.floor(Math.random() * 5)],
            destination: ['City Mall', 'Public Market', 'High School', 'Plaza', 'Barangay Hall'][Math.floor(Math.random() * 5)],
            fareOffer: Math.floor(Math.random() * 40) + 20,
            distance: `${(Math.random() * 3).toFixed(1)} km`,
            status: 'pending',
            timestamp: Date.now(),
          };
          setIncomingRequests(prev => [newReq, ...prev]);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [view, driverStatus, incomingRequests, activeRide, userLocation]);

  const handleSmartEstimate = async () => {
    if (!destination) return;
    setIsCalculating(true);
    const insight = await getRouteInsight(destination, userLocation || undefined);
    setRouteInsight(insight);
    setIsCalculating(false);
  };

  // RIDER FLOW: Request Ride
  const handleRequestRide = () => {
    setRequestSent(true);
    
    if (rideTimerRef.current) clearTimeout(rideTimerRef.current);

    // Simulate finding a driver after 3 seconds
    rideTimerRef.current = setTimeout(() => {
      if (user && routeInsight) {
        const newRide: RideRequest = {
            id: Date.now().toString(),
            passengerName: user.name,
            destination: destination,
            fareOffer: routeInsight.estimatedFare,
            distance: routeInsight.distanceLabel,
            status: 'in-progress',
            timestamp: Date.now(),
        };
        
        setRequestSent(false);
        setActiveRide(newRide);
        // Start the chat immediately with a welcome message from simulated driver
        setChatMessages([{
            id: 'sys-1',
            senderId: 'driver-bot',
            text: `Hello ${user.name}! I'm on my way to pick you up.`,
            timestamp: Date.now(),
            role: 'driver'
        }]);
      }
    }, 3000);
  };

  // RIDER FLOW: Cancel
  const handleConfirmCancel = () => {
    if (rideTimerRef.current) {
        clearTimeout(rideTimerRef.current);
        rideTimerRef.current = null;
    }
    setRequestSent(false);
    setActiveRide(null);
    setShowCancelConfirm(false);
  };

  // RIDER FLOW: Complete Ride (Manual)
  const handleRiderComplete = () => {
      if (!activeRide || !user) return;
      
      const completedRide: RideRequest = {
        ...activeRide,
        status: 'completed',
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      const updatedHistory = saveRideToHistory(user.id, completedRide);
      setRideHistory(updatedHistory);
      
      setActiveRide(null);
      setDestination('');
      setRouteInsight(null);
  };

  // DRIVER FLOW: Accept
  const handleDriverAccept = (req: RideRequest) => {
    setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
    setActiveRide({ ...req, status: 'in-progress' });
    setDriverStatus(DriverStatus.BUSY);
    // Reset Title
    document.title = "Triip - Ride In Progress";
    
    // Simulate Rider message
    setChatMessages([{
        id: 'sys-1',
        senderId: 'rider-bot',
        text: `Hi! I'm waiting at the pickup point.`,
        timestamp: Date.now(),
        role: 'rider'
    }]);
  };

  // DRIVER FLOW: Complete
  const handleDriverComplete = () => {
    if (activeRide && user) {
      const completedRide: RideRequest = {
        ...activeRide,
        status: 'completed',
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      
      const updatedHistory = saveRideToHistory(user.id, completedRide);
      setRideHistory(updatedHistory);
      
      setActiveRide(null);
      setDriverStatus(DriverStatus.AVAILABLE);
      document.title = "Triip";
    }
  };

  // CHAT LOGIC
  const handleSendMessage = (text: string) => {
    if (!user || !activeRide) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      text,
      timestamp: Date.now(),
      role: user.role as 'rider' | 'driver'
    };

    setChatMessages(prev => [...prev, newMessage]);

    // Simulate Reply
    setTimeout(() => {
      const replyText = user.role === 'rider' 
        ? ["I'm almost there!", "Traffic is a bit heavy.", "Okay, see you soon."][Math.floor(Math.random() * 3)]
        : ["Okay po, thank you.", "I am wearing a blue shirt.", "I'll be waiting."][Math.floor(Math.random() * 3)];

      const replyMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        senderId: user.role === 'rider' ? 'driver-bot' : 'rider-bot', // Simulated ID
        text: replyText,
        timestamp: Date.now(),
        role: user.role === 'rider' ? 'driver' : 'rider'
      };
      setChatMessages(prev => [...prev, replyMsg]);
    }, 2000);
  };

  const NavHeader = () => (
    <nav className="fixed top-0 left-0 right-0 z-40 p-4 flex justify-between items-center pointer-events-none">
      <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform" onClick={() => !user?.role && setView('landing')}>
        <div className="bg-amber-400 p-1.5 rounded-lg text-slate-900">
          <Navigation2 size={20} fill="currentColor" />
        </div>
        <span className="font-bold text-slate-900 pr-2">Triip</span>
      </div>
      
      <div className="pointer-events-auto flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-sm border border-slate-100 mr-2">
             <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
               {user.name.charAt(0).toUpperCase()}
             </div>
             <span className="text-sm font-medium text-slate-700">{user.name}</span>
             {user.role && (
               <Badge color={user.role === 'driver' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}>
                 {user.role}
               </Badge>
             )}
          </div>
        )}
        <Button variant="ghost" className="bg-white/90 backdrop-blur-md !p-2 rounded-xl shadow-sm border border-slate-100" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </Button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="absolute top-16 right-4 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden pointer-events-auto flex flex-col z-50"
          >
            {user && (
               <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                 <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Signed in as</p>
                 <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
               </div>
            )}
            
            {(!user || !user.role) && (
              <>
                <button onClick={() => { handleModeSelect('rider'); setMenuOpen(false); }} className="px-4 py-3 text-left hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-3 transition-colors">
                  <UserIcon size={16} /> Rider Mode
                </button>
                <button onClick={() => { handleModeSelect('driver'); setMenuOpen(false); }} className="px-4 py-3 text-left hover:bg-slate-50 text-sm font-medium text-slate-700 flex items-center gap-3 border-t border-slate-100 transition-colors">
                  <Car size={16} /> Driver Mode
                </button>
              </>
            )}

            {user && user.role && (
               <div className="px-4 py-3 text-xs text-slate-400 italic">
                 Mode locked: {user.role}
               </div>
            )}

            {user && (
              <button onClick={handleLogout} className="px-4 py-3 text-left hover:bg-red-50 text-sm font-medium text-red-600 flex items-center gap-3 border-t border-slate-100 transition-colors">
                <LogOut size={16} /> Sign Out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );

  const HistoryList = () => (
    <div className="space-y-3">
      {rideHistory.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <History size={48} className="mx-auto mb-3 opacity-20" />
          <p>No rides yet</p>
        </div>
      ) : (
        rideHistory.map((ride) => (
          <motion.div 
            key={ride.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-100 rounded-xl p-4 flex justify-between items-center shadow-sm"
          >
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <span className="font-bold text-slate-900">{ride.destination}</span>
               </div>
               <div className="text-xs text-slate-500 flex items-center gap-2">
                 <span>{ride.date || 'Just now'}</span>
                 <span>•</span>
                 <span>{ride.distance}</span>
               </div>
            </div>
            <div className="text-right">
              <Badge color="bg-slate-100 text-slate-700">₱{ride.fareOffer}</Badge>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="relative h-screen w-full overflow-hidden text-slate-900">
      <NavHeader />
      
      {/* REAL MAP INTEGRATION */}
      <Map 
        userLocation={userLocation} 
        userRole={view === 'kyc' ? 'landing' : view === 'landing' ? 'landing' : user?.role || 'landing'} 
        destination={destination}
      />

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <Auth 
              onLogin={handleLogin} 
              onCancel={() => { setShowAuth(false); setPendingView(null); }} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT UI */}
      {activeRide && (
        <>
          <Chat 
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            currentUserId={user?.id || ''}
            otherPartyName={user?.role === 'rider' ? 'Driver' : activeRide.passengerName}
          />
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-4 z-40 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-slate-800 hover:scale-110 transition-all"
          >
             <MessageCircle size={24} />
             {chatMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
             )}
          </motion.button>
        </>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 h-full flex flex-col justify-end pb-8 sm:justify-center sm:items-center sm:pb-0 px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md">
          <AnimatePresence mode="wait">
            
            {/* LANDING VIEW */}
            {view === 'landing' && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full space-y-4"
              >
                <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 text-center">
                  <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-400/30">
                    <Navigation2 size={32} className="text-slate-900" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Move Freely.</h1>
                  <p className="text-slate-500 mb-8 leading-relaxed">The smartest way to catch a tricycle ride. AI-powered routes, fair prices, real-time tracking.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => handleModeSelect('rider')} className="w-full h-14 text-lg">
                      I'm a Rider
                    </Button>
                    <Button onClick={() => handleModeSelect('driver')} variant="outline" className="w-full h-14 text-lg bg-white/50">
                      I'm a Driver
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* KYC VIEW */}
            {view === 'kyc' && user && (
               <motion.div
                key="kyc"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full"
               >
                 <KYC user={user} onComplete={handleKYCComplete} />
               </motion.div>
            )}

            {/* RIDER VIEW */}
            {view === 'rider' && (
              <motion.div
                key="rider"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="w-full h-[65vh] sm:h-auto flex flex-col justify-end sm:block"
              >
                {showHistory ? (
                  <Card className="shadow-2xl shadow-slate-200/50 backdrop-blur-xl bg-white/95 h-full max-h-[500px] flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" className="!p-1 w-8 h-8" onClick={() => setShowHistory(false)}>
                           <ChevronLeft size={20} />
                        </Button>
                        <h2 className="font-bold text-lg">Your Rides</h2>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <HistoryList />
                    </div>
                  </Card>
                ) : activeRide ? (
                    // RIDER: ACTIVE RIDE UI
                    <Card className="bg-white p-6 space-y-6 relative overflow-hidden shadow-2xl border-t-4 border-amber-400">
                        <div className="flex items-start justify-between">
                           <div>
                              <Badge color="bg-emerald-100 text-emerald-700 mb-2">In Progress</Badge>
                              <h2 className="text-xl font-bold">{activeRide.destination}</h2>
                              <p className="text-slate-500 text-sm">Arriving in ~5 mins</p>
                           </div>
                           <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                             <Car size={24} className="text-slate-700" />
                           </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm font-bold text-slate-700">
                              D
                           </div>
                           <div>
                              <p className="font-bold text-slate-900">Your Driver</p>
                              <p className="text-xs text-slate-500">Honda TMX • 4.9 ★</p>
                           </div>
                           <div className="ml-auto font-bold text-lg">₱{activeRide.fareOffer}</div>
                        </div>
                        
                        <div className="flex gap-2">
                             <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleRiderComplete}>
                                 <CheckCircle2 size={18} /> Arrived
                             </Button>
                        </div>
                        <p className="text-center text-xs text-slate-400">Chat with your driver using the button below</p>
                    </Card>
                ) : !requestSent ? (
                  // RIDER: INPUT UI
                  <Card className="shadow-2xl shadow-slate-200/50 backdrop-blur-xl bg-white/95">
                    <div className="p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-xl font-bold mb-1">Where to, {user?.name}?</h2>
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                             <MapIcon size={12} /> Maps Grounding Active
                          </p>
                        </div>
                        <Button variant="ghost" className="!p-2 text-slate-400 hover:text-slate-600" onClick={() => setShowHistory(true)}>
                          <History size={20} />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3.5 text-amber-500" size={20} />
                          <Input 
                            placeholder="e.g. 'City Hall near the park'" 
                            className="pl-10 h-14 text-lg"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                          />
                        </div>

                        {routeInsight && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100"
                          >
                            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                              <div>
                                <p className="text-sm text-slate-500">Estimated Fare</p>
                                <p className="text-2xl font-bold text-slate-900">₱{routeInsight.estimatedFare}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-slate-500">Distance</p>
                                <p className="text-lg font-semibold text-slate-700">{routeInsight.distanceLabel}</p>
                              </div>
                            </div>
                            <div className="text-sm text-slate-600 italic">
                                "{routeInsight.fullSummary}"
                            </div>

                            {!routeInsight.groundingMetadata && (
                                <div className="flex gap-2 text-xs">
                                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                        <Sparkles size={12} /> AI Estimate
                                    </span>
                                </div>
                            )}
                          </motion.div>
                        )}

                        {!routeInsight ? (
                          <Button 
                              variant="secondary" 
                              className="w-full h-12" 
                              onClick={handleSmartEstimate}
                              disabled={!destination || isCalculating}
                            >
                            {isCalculating ? (
                                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> Calculating...</span>
                            ) : (
                                <span className="flex items-center gap-2"><Sparkles size={18} /> Get Smart Estimate</span>
                            )}
                          </Button>
                        ) : (
                          <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setRouteInsight(null)} className="flex-1">Back</Button>
                            <Button onClick={handleRequestRide} className="flex-[2] h-12">Request Tricycle</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : (
                  // RIDER: FINDING DRIVER UI
                  <Card className="bg-white p-8 text-center space-y-6 relative overflow-hidden shadow-2xl">
                     <AnimatePresence>
                       {showCancelConfirm && (
                           <motion.div 
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             exit={{ opacity: 0 }}
                             className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                           >
                              <div className="w-full space-y-4">
                                 <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full mx-auto flex items-center justify-center">
                                   <AlertCircle size={24} />
                                 </div>
                                 <h3 className="text-lg font-bold">Cancel Ride?</h3>
                                 <p className="text-sm text-slate-500">Are you sure you want to cancel?</p>
                                 <div className="flex gap-2 w-full">
                                     <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(false)}>No</Button>
                                     <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmCancel}>Yes, Cancel</Button>
                                 </div>
                              </div>
                           </motion.div>
                       )}
                     </AnimatePresence>

                    <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <Car size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Finding a Driver...</h3>
                      <p className="text-slate-500">Broadcasting request nearby.</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-emerald-500 w-2/3 animate-[pulse_1s_ease-in-out_infinite]"></div>
                    </div>
                    <Button variant="outline" onClick={() => setShowCancelConfirm(true)}>Cancel Request</Button>
                  </Card>
                )}
              </motion.div>
            )}

            {/* DRIVER VIEW */}
            {view === 'driver' && (
              <motion.div
                key="driver"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="w-full h-[65vh] flex flex-col"
              >
                <Card className="flex-1 flex flex-col shadow-2xl backdrop-blur-md bg-white/95 h-full max-h-[600px] overflow-hidden relative">
                  
                  {/* Notification Banner */}
                  <AnimatePresence>
                    {showNewRequestAlert && (
                        <motion.div 
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            className="absolute top-0 left-0 right-0 bg-amber-400 text-slate-900 p-3 z-20 flex items-center justify-center gap-2 shadow-md font-bold"
                        >
                            <Bell className="animate-bounce" size={20} />
                            New Ride Request!
                        </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    {showHistory ? (
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" className="!p-1 w-8 h-8" onClick={() => setShowHistory(false)}>
                           <ChevronLeft size={20} />
                        </Button>
                        <h2 className="font-bold text-lg">Trip History</h2>
                      </div>
                    ) : (
                       <>
                         <div>
                           <h2 className="font-bold text-lg">Driver Dashboard</h2>
                           <p className="text-xs text-slate-500">{driverStatus === DriverStatus.AVAILABLE ? 'Searching...' : activeRide ? 'Ride in progress' : 'Offline'}</p>
                         </div>
                         <div className="flex gap-2">
                            <Button variant="ghost" className="!p-2" onClick={() => setShowHistory(true)}>
                              <History size={20} />
                            </Button>
                            <button 
                              onClick={() => setDriverStatus(prev => prev === DriverStatus.OFFLINE ? DriverStatus.AVAILABLE : DriverStatus.OFFLINE)}
                              disabled={!!activeRide}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${driverStatus !== DriverStatus.OFFLINE ? 'bg-emerald-500' : 'bg-slate-200'} ${activeRide ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${driverStatus !== DriverStatus.OFFLINE ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                         </div>
                       </>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {showHistory ? (
                      <HistoryList />
                    ) : activeRide ? (
                      <div className="h-full flex flex-col justify-between">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center space-y-4">
                             <div className="w-16 h-16 bg-white text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-sm">
                                <UserIcon size={32} />
                             </div>
                             <div>
                               <h3 className="text-2xl font-bold text-slate-900">{activeRide.passengerName}</h3>
                               <p className="text-emerald-700 font-medium">{activeRide.destination}</p>
                             </div>
                             <div className="flex justify-center gap-4 text-sm text-slate-600">
                               <div className="bg-white px-3 py-1 rounded-lg shadow-sm">₱{activeRide.fareOffer}</div>
                               <div className="bg-white px-3 py-1 rounded-lg shadow-sm">{activeRide.distance}</div>
                             </div>
                          </div>
                          
                          <Button onClick={handleDriverComplete} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20 text-lg">
                             <CheckCircle2 size={20} /> Complete Ride
                          </Button>
                      </div>
                    ) : driverStatus === DriverStatus.OFFLINE ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                            <Clock size={24} />
                          </div>
                          <p>Go online to start receiving requests</p>
                        </div>
                    ) : incomingRequests.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                          <div className="animate-ping w-3 h-3 bg-emerald-400 rounded-full mb-4"></div>
                          <p>Scanning area...</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                          {incomingRequests.map((req) => (
                            <motion.div
                              key={req.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-bold text-slate-900">{req.passengerName}</h3>
                                  <div className="flex items-center text-xs text-slate-500 mt-1">
                                    <MapPin size={12} className="mr-1" /> {req.destination}
                                  </div>
                                </div>
                                <Badge color="bg-emerald-100 text-emerald-700">₱{req.fareOffer}</Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                                <span>{req.distance} away</span>
                                <span className="flex items-center gap-1"><Navigation2 size={12} /> Easy Route</span>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button 
                                  className="flex-1 h-9 text-sm" 
                                  onClick={() => handleDriverAccept(req)}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  className="h-9 w-9 p-0"
                                  onClick={() => setIncomingRequests(prev => prev.filter(r => r.id !== req.id))}
                                >
                                  <X size={16} />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default App;
