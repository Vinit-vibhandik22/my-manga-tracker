import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, where, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { Send, BookOpen, Trash2, Loader, Plus, X, Search, Edit, Save, AlertTriangle, Image as ImageIcon, Star, Notebook, ArrowUpNarrowWide, ArrowDownWideNarrow } from 'lucide-react'; // Added Notebook & Sort Icons

// Global Variables provided by the Canvas Environment:
// Global Variables for GitHub project:
const appId = 'my-github-app'; // This can be any string
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
const initialAuthToken = undefined; // Not needed outside this environment

// --- UTILITY FUNCTIONS ---
const JIKAN_API_URL = 'https://api.jikan.moe/v4/manga';
const getUserCollectionPath = (userId) => `/artifacts/${appId}/users/${userId}/tracking_items`;

// Status options for tracking
const Status = {
  READING: 'Reading',
  PLAN_TO_READ: 'Plan to Read',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
};

// --- MODAL & CARD COMPONENTS (Defined outside App) ---

/**
 * A modal for searching the Jikan API and adding new items
 */
const SearchModal = ({ onClose, onTrackItem }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackedIds, setTrackedIds] = useState(new Set()); // To disable buttons for already-tracked items

  const handleSearch = async (e) => {
    e.preventDefault();
    if (query.trim().length < 3) {
      setError('Please enter at least 3 characters to search.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`${JIKAN_API_URL}?q=${encodeURIComponent(query)}&limit=15`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      setResults(data.data || []);
    } catch (err) {
      console.error("API search failed:", err);
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleTrack = (result) => {
    onTrackItem(result);
    setTrackedIds(prev => new Set(prev).add(result.mal_id)); // Visually disable button
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl border border-gray-700 relative flex flex-col h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-cyan-300 mb-6">Search and Add Title</h2>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search for Manga, Manhwa..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 transition duration-200 text-white font-semibold rounded-lg flex items-center justify-center shadow-md"
            disabled={isLoading}
          >
            {isLoading ? <Loader className="animate-spin" size={20} /> : <Search size={20} />}
          </button>
        </form>

        {/* Results Area */}
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
          {error && <p className="text-center text-red-400">{error}</p>}
          {!isLoading && results.length === 0 && !error && (
            <p className="text-center text-gray-400 pt-8">Search results will appear here.</p>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((result, index) => (
              <div key={`${result.mal_id}-${index}`} className="bg-gray-700 rounded-lg p-3 flex gap-3">
                <img
                  src={result.images?.jpg?.image_url}
                  alt={result.title}
                  className="w-20 h-28 object-cover rounded-md flex-shrink-0"
                  onError={(e) => e.target.src = 'https://placehold.co/80x112/374151/9ca3af?text=No+Img'}
                />
                <div className="flex flex-col justify-between overflow-hidden">
                  <div>
                    <h3 className="text-base font-bold text-white truncate" title={result.title}>
                      {result.title}
                    </h3>
                    <p className="text-sm text-cyan-300">{result.type} {result.status ? `(${result.status})` : ''}</p>
                    <p className="text-xs text-gray-300">
                      {result.chapters ? `${result.chapters} Chapters` : 'N/A Chapters'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleTrack(result)}
                    disabled={trackedIds.has(result.mal_id)}
                    className="self-start mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 transition duration-200 text-white font-semibold rounded-md text-sm disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    {trackedIds.has(result.mal_id) ? 'Added' : 'Track'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


/**
 * A modal for confirming deletion of an item
 */
const ConfirmDeleteModal = ({ itemTitle, onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
    <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md border border-gray-700">
      <div className="flex items-center mb-4">
        <AlertTriangle className="text-red-500 mr-3" size={24} />
        <h2 className="text-xl font-bold text-white">Confirm Deletion</h2>
      </div>
      <p className="text-gray-300 mb-6">
        Are you sure you want to delete <strong className="text-cyan-300">{itemTitle}</strong>? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-4">
        <button
          onClick={onCancel}
          className="px-5 py-2 bg-gray-600 hover:bg-gray-500 transition duration-200 text-white font-semibold rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 transition duration-200 text-white font-semibold rounded-lg shadow-md"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

/**
 * NEW Star Rating Input Component
 */
const StarRatingInput = ({ rating, setRating }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const totalStars = 10;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Your Rating</label>
      <div className="flex items-center space-x-1">
        {[...Array(totalStars)].map((_, index) => {
          const starValue = index + 1;
          return (
            <button
              type="button" // Important! Prevents form submission
              key={starValue}
              className={`transition-colors duration-150 ${
                starValue <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-500'
              } hover:text-yellow-300`}
              onClick={() => setRating(starValue === rating ? 0 : starValue)} // Click again to clear
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
            >
              <Star size={24} fill="currentColor" />
            </button>
          );
        })}
        <span className="ml-3 text-lg font-bold text-white w-12 text-right">
          {rating ? `${rating}` : '-'}
          <span className="text-sm text-gray-400">/{totalStars}</span>
        </span>
      </div>
    </div>
  );
};

/**
 * A modal for editing an existing tracking item (UPDATED with Rating & Notes)
 */
const EditModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...item });
  const [currentRating, setCurrentRating] = useState(item.rating || 0); // Local state for stars

  useEffect(() => {
    // Reset form data if the item being edited changes
    setFormData({ ...item });
    setCurrentRating(item.rating || 0);
  }, [item]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, rating: currentRating }); // Pass the rating on save
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
      {/* MODIFIED: Added flex flex-col and max-h-[90vh] to make the modal scrollable */}
      <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-lg border border-gray-700 relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-cyan-300 mb-6">Edit Title</h2>
        
        {/* MODIFIED: Form is now flex-col and fills height */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden space-y-4">
          
          {/* MODIFIED: All form content is in a scrollable div */}
          <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
            {item.imageUrl && (
              <div className="flex justify-center mb-4">
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  className="w-24 h-36 object-cover rounded-lg"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Manga">Manga</option>
                  <option value="Manhwa">Manhwa</option>
                  <option value="Manhua">Manhua</option>
                  <option value="Novel">Novel</option>
                  {/* Jikan might provide other types, so add it if not standard */}
                  {!['Manga', 'Manhwa', 'Manhua', 'Novel'].includes(formData.type) && (
                    <option value={formData.type}>{formData.type}</option>
                  )}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(Status).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Current Chapter</label>
                <input
                  type="number"
                  name="currentChapter"
                  min="0"
                  value={formData.currentChapter}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-1">Total Chapters</label>
                <input
                  type="number"
                  name="totalChapters"
                  min="0"
                  placeholder="0 (or blank)"
                  value={formData.totalChapters}
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* --- NEW RATING BLOCK --- */}
            <div className="pt-2">
              <StarRatingInput rating={currentRating} setRating={setCurrentRating} />
            </div>
            {/* --- END NEW RATING BLOCK --- */}

            {/* --- NEW NOTES BLOCK --- */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Personal Notes</label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                rows="3"
                placeholder="Add your personal notes here..."
                className="w-full p-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* --- END NEW NOTES BLOCK --- */}
          </div>


          {/* MODIFIED: Save button is now flex-shrink-0 to stay at bottom */}
          <div className="pt-4 flex justify-end flex-shrink-0">
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 transition duration-200 text-white font-semibold rounded-lg flex items-center justify-center shadow-md"
            >
              <Save size={20} className="mr-2" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * A card component for a single tracking item (UPGRADED WITH RATING & NOTES ICON)
 */
const TrackingCard = ({ item, onUpdateChapter, onDeleteItem, onEditClick, getStatusColor }) => {
  
  const [imgError, setImgError] = useState(false);
  const imageUrl = item.imageUrl || null;

  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg transition duration-300 hover:shadow-cyan-500/30 flex flex-col justify-between border border-gray-700 overflow-hidden">
      <div>
        {/* Image Section */}
        <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
          {!imgError && imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <ImageIcon className="text-gray-500" size={48} />
          )}
        </div>
        
        <div className="p-4">
          {/* Status Badge */}
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(item.status)} text-white mb-2 inline-block`}>
            {item.status}
          </span>
          <h3 className="text-xl font-bold text-white mb-1 truncate" title={item.title}>{item.title}</h3>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-cyan-300">{item.type}</p>
            {/* --- NEW NOTES ICON --- */}
            {item.notes && (
              <Notebook size={16} className="text-gray-400 flex-shrink-0" title="This item has notes" />
            )}
            {/* --- END NEW NOTES ICON --- */}
          </div>


          {/* --- NEW RATING DISPLAY --- */}
          {item.rating > 0 && (
            <div className="flex items-center mb-3">
              <Star size={18} className="text-yellow-400 fill-yellow-400 mr-1.5" />
              <span className="text-lg font-bold text-white">{item.rating} <span className="text-sm text-gray-400">/ 10</span></span>
            </div>
          )}
          {/* --- END NEW RATING DISPLAY --- */}

          {/* Chapter Count */}
          <p className="text-lg font-mono text-gray-200 mb-4">
            Chapter <span className="text-2xl font-extrabold text-blue-400">{item.currentChapter}</span>
            {item.totalChapters > 0 && (
              <span className="text-gray-400"> / {item.totalChapters}</span>
            )}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 p-4 border-t border-gray-700">
        <button
          onClick={() => onUpdateChapter(item, 1)}
          className="flex-grow py-2 bg-green-600 hover:bg-green-700 transition duration-200 text-white font-semibold rounded-lg text-sm"
        >
          <Plus size={16} className="inline mr-1" /> Next
        </button>
        <button
          onClick={() => onUpdateChapter(item, -1)}
          disabled={item.currentChapter <= 0}
          className="py-2 px-3 bg-gray-700 hover:bg-gray-600 transition duration-200 text-white font-semibold rounded-lg disabled:opacity-50"
        >
          -1
        </button>
        <button
          onClick={() => onEditClick(item)}
          className="p-2 bg-blue-600 hover:bg-blue-700 transition duration-200 text-white rounded-lg"
        >
          <Edit size={18} />
        </button>
        <button
          onClick={() => onDeleteItem(item)}
          className="p-2 bg-red-600 hover:bg-red-700 transition duration-200 text-white rounded-lg"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---

const App = () => {
  // Firebase State
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Application State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('lastUpdated'); // 'lastUpdated', 'title', 'rating'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'

  // Modal State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); // Replaced isAdding
  const [isEditing, setIsEditing] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  // 1. FIREBASE INITIALIZATION & AUTHENTICATION
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      // Listener for Auth State Changes
      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
          if (initialAuthToken && user.isAnonymous) {
            try {
              await signInWithCustomToken(authInstance, initialAuthToken);
            } catch (error) {
              console.error("Custom token sign-in failed, continuing anonymously:", error);
            }
          }
        } else {
          await signInAnonymously(authInstance);
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      setLoading(false);
    }
  }, []);

  // 2. FIRESTORE DATA SUBSCRIPTION (onSnapshot) (UPDATED with Rating & Notes)
  useEffect(() => {
    if (!db || !userId) {
      if (isAuthReady) setLoading(false);
      return;
    }

    setLoading(true);
    const trackingCollectionRef = collection(db, getUserCollectionPath(userId));
    const q = query(trackingCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trackingItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        currentChapter: Number(doc.data().currentChapter) || 0,
        totalChapters: Number(doc.data().totalChapters) || 0,
        rating: Number(doc.data().rating) || 0, // <-- ADDED RATING
        notes: doc.data().notes || "", // <-- ADDED NOTES
        lastUpdated: doc.data().lastUpdated || 0, // <-- Ensure lastUpdated is loaded
      }));

      // NOTE: We no longer sort here. Sorting is handled by useMemo.
      setItems(trackingItems);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching items:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady]);

  // --- CRUD OPERATIONS ---

  /**
   * Adds a new item to tracking from an API result (UPDATED with Rating & Notes)
   */
  const handleAddItem = async (apiResult) => {
    if (!db || !userId) return;
    
    // Check if this item (by mal_id) is already tracked
    const isAlreadyTracked = items.some(item => item.apiId === apiResult.mal_id);
    if (isAlreadyTracked) {
      console.log("Item already tracked.");
      // We could add a user-facing notification here
      return;
    }

    try {
      const trackingCollectionRef = collection(db, getUserCollectionPath(userId));
      const newItem = {
        apiId: apiResult.mal_id, // Store the API's ID
        title: apiResult.title,
        type: apiResult.type || 'Manga',
        status: Status.PLAN_TO_READ,
        currentChapter: 0,
        totalChapters: apiResult.chapters || 0,
        imageUrl: apiResult.images?.jpg?.image_url || '',
        rating: 0, // <-- ADDED DEFAULT RATING
        notes: "", // <-- ADDED DEFAULT NOTES
        lastUpdated: Date.now(),
      };

      await addDoc(trackingCollectionRef, newItem);

      // Don't close modal, just let the user add more
      // setIsSearchModalOpen(false); 
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleUpdateChapter = async (item, delta) => {
    if (!db || !userId) return;
    try {
      const itemRef = doc(db, getUserCollectionPath(userId), item.id);
      const newChapter = Math.max(0, item.currentChapter + delta);
      
      let newStatus = item.status;
      const total = Number(item.totalChapters) || 0;

      if (newChapter > 0 && item.status === Status.PLAN_TO_READ) {
        newStatus = Status.READING;
      } else if (total > 0 && newChapter >= total) {
        newStatus = Status.COMPLETED;
      } else if (newChapter > 0 && newChapter < total && item.status === Status.COMPLETED) {
        newStatus = Status.READING;
      } else if (newChapter === 0 && item.status === Status.READING) {
        newStatus = Status.PLAN_TO_READ;
      }

      await setDoc(itemRef, {
        ...item,
        currentChapter: newChapter,
        status: newStatus,
        lastUpdated: Date.now(),
      }, { merge: true }); // Use merge:true to be safe
    } catch (error) {
      console.error("Error updating chapter:", error);
    }
  };

  const handleDeleteItem = (item) => {
    setIsDeleting(item);
  };

  const executeDelete = async () => {
    if (!db || !userId || !isDeleting) return;

    try {
      const itemRef = doc(db, getUserCollectionPath(userId), isDeleting.id);
      await deleteDoc(itemRef);
      setIsDeleting(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      setIsDeleting(null);
    }
  };
  
  // *** THIS FUNCTION IS NOW FIXED ***
  const handleSaveEdit = async (updatedData) => {
    // (UPDATED with Rating & Notes)
    if (!db || !userId || !isEditing) return;
    try {
      const itemRef = doc(db, getUserCollectionPath(userId), isEditing.id);
      
      const newCurrent = Number(updatedData.currentChapter) || 0;
      const newTotal = Number(updatedData.totalChapters) || 0;
      const newRating = Number(updatedData.rating) || 0; // Get rating
      let newStatus = updatedData.status;

      if (newStatus === Status.PLAN_TO_READ && newCurrent > 0) {
        newStatus = Status.READING;
      } else if (newTotal > 0 && newCurrent >= newTotal) {
        newStatus = Status.COMPLETED;
      }
      
      const itemToSave = {
        ...isEditing, // Start with the original item
        ...updatedData, // Overwrite with form data (which includes rating & notes)
        currentChapter: newCurrent,
        totalChapters: newTotal,
        rating: newRating,
        status: newStatus,
        lastUpdated: Date.now(),
      };
      
      // Ensure we don't accidentally remove the imageUrl if it wasn't in the form
      itemToSave.imageUrl = itemToSave.imageUrl || (isEditing.imageUrl || '');

      await setDoc(itemRef, itemToSave, { merge: true }); // Use merge: true
      setIsEditing(null);
    } catch (error) { 
      console.error("Error saving document:", error);
    }
  };

  // --- SORTING & FILTERING (NEW useMemo block) ---
  
  const sortedAndFilteredItems = useMemo(() => {
    // 1. Sort the items
    const sorted = [...items].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle different data types for sorting
      if (sortField === 'title') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      } else {
        // Default to number (for rating and lastUpdated)
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    // 2. Apply filters
    return sorted
      .filter(item => filterStatus === 'All' || item.status === filterStatus)
      .filter(item => (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()));

  }, [items, sortField, sortDirection, filterStatus, searchQuery]);


  // --- UI LOGIC ---

  const getStatusColor = (status) => {
    switch (status) {
      case Status.READING:
        return 'bg-blue-500';
      case Status.COMPLETED:
        return 'bg-green-500';
      case Status.PLAN_TO_READ:
        return 'bg-gray-400';
      case Status.DROPPED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // const filteredAndSearchedItems = items // <-- This is now replaced by sortedAndFilteredItems
  //   .filter(item => filterStatus === 'All' || item.status === filterStatus)
  //   .filter(item => (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()));

  // If auth is not ready, show a simple initial loading screen
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader className="animate-spin mr-3 text-blue-400" size={24} />
        Connecting to the Tracker Database...
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4 sm:mb-0">
          Comic Vibe Tracker
        </h1>
        <div className="text-sm text-gray-400 flex flex-col sm:flex-row items-center">
          <span className="mr-2 hidden sm:block">User ID:</span>
          <code className="text-xs bg-gray-800 p-1 rounded break-all">{userId}</code>
        </div>
      </header>

      {/* Controls: Search, Filter, Add */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative w-full sm:w-1/3">
          <input
            type="text"
            placeholder="Search your tracked titles..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-150 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>

        {/* Status Filter */}
        <select
          className="w-full sm:w-auto p-2 bg-gray-800 border border-gray-700 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-150 cursor-pointer"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)} // <-- *** FIX 2 ***
        >
          <option value="All">All Statuses</option>
          {Object.values(Status).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        {/* --- NEW SORT CONTROLS --- */}
        <select
          className="w-full sm:w-auto p-2 bg-gray-800 border border-gray-700 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-150 cursor-pointer"
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
        >
          <option value="lastUpdated">Sort by Updated</option>
          <option value="title">Sort by Title</option>
          <option value="rating">Sort by Rating</option>
        </select>
        
        <button
          onClick={() => setSortDirection(dir => dir === 'asc' ? 'desc' : 'asc')}
          className="w-full sm:w-auto p-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 transition duration-150 flex items-center justify-center"
          title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          {sortDirection === 'asc' ? <ArrowUpNarrowWide size={20} /> : <ArrowDownWideNarrow size={20} />}
        </button>
        {/* --- END SORT CONTROLS --- */}


        {/* Add Button (Now opens Search Modal) */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 transition duration-200 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/50"
        >
          <Plus size={20} className="mr-2" />
          Add New Title
        </button>
      </div>

      {/* Loading & Empty States */}
      {loading && (
        <div className="text-center py-12">
          <Loader className="animate-spin mx-auto text-cyan-400" size={36} />
          <p className="mt-4 text-lg text-gray-400">Loading your tracking list...</p>
        </div>
      )}

      {!loading && sortedAndFilteredItems.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-2xl border border-gray-700">
          <BookOpen className="mx-auto text-gray-500" size={48} />
          <p className="mt-4 text-xl font-semibold text-gray-300">No titles found.</p>
          <p className="text-gray-400">Try adjusting your filters or search, or click "Add New Title" to start tracking!</p>
        </div>
      )}

      {/* Tracking List */}
      {!loading && sortedAndFilteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAndFilteredItems.map((item) => (
            <TrackingCard
              key={item.id}
              item={item}
              onUpdateChapter={handleUpdateChapter}
              onDeleteItem={handleDeleteItem}
              onEditClick={setIsEditing}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {isSearchModalOpen && (
        <SearchModal
          onClose={() => setIsSearchModalOpen(false)}
          onTrackItem={handleAddItem}
        />
      )}

      {isEditing && (
        <EditModal
          item={isEditing}
          onClose={() => setIsEditing(null)}
          onSave={handleSaveEdit}
        />
      )}
      
      {isDeleting && (
        <ConfirmDeleteModal
          itemTitle={isDeleting.title}
          onCancel={() => setIsDeleting(null)}
          onConfirm={executeDelete}
        />
      )}
    </div>
  );
};

export default App;