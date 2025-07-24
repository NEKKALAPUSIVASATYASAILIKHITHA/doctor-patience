
import React, { useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import axios from 'axios';

interface Doctor {
  _id: string;
  name: string;
  clinic: {
    address: string;
    location: {
      coordinates: [number, number]; 
    };
  };
}

interface Location {
  lat: number;
  lng: number;
}

const containerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter: Location = {
  lat: 12.9716,
  lng: 77.5946, 
};

const App: React.FC = () => {
  
  const [isDoctorMode, setIsDoctorMode] = useState(false);
  const [center, setCenter] = useState<Location>(defaultCenter);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  const [doctorName, setDoctorName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const handlePatientSearch = async () => {
    if (!location.trim()) {
      setError('Please enter a location to search');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const geoRes = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: location,
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          },
        }
      );

      const results = geoRes.data.results;
      if (!results || results.length === 0) {
        throw new Error('Location not found. Please enter a valid place.');
      }

      const { lat, lng } = results[0].geometry.location;
      setCenter({ lat, lng });

      const response = await axios.get(
        `http://localhost:3001/api/doctors/nearby`,
        {
          params: {
            lat,
            lng,
            maxDistance: 5000,
          },
        }
      );

      setDoctors(response.data);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

 
  const handleAddressSearch = async () => {
    try {
      const geoRes = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: clinicAddress,
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          },
        }
      );

      const results = geoRes.data.results;
      if (!results || results.length === 0) {
        alert("Address not found. Please enter a valid address.");
        return;
      }

      const { lat, lng } = results[0].geometry.location;
      setCenter({ lat, lng });
      setSelectedLocation({ lat, lng });
    } catch (err) {
      console.error("Failed to geocode address", err);
      alert("An error occurred. Please try again.");
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedLocation({
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    }
  };

  const handleDoctorSubmit = async () => {
    if (!doctorName || !clinicAddress || !selectedLocation) {
      alert("Please fill all fields and select a location");
      return;
    }

    try {
      await axios.post('http://localhost:3001/api/doctors', {
        name: doctorName,
        address: clinicAddress
      });
      alert("Doctor registered successfully!");
      setDoctorName('');
      setClinicAddress('');
      setSelectedLocation(null);
    } catch (err) {
      console.error("Failed to register doctor", err);
      alert("Failed to register doctor. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      isDoctorMode ? handleAddressSearch() : handlePatientSearch();
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <button
        onClick={() => setIsDoctorMode(!isDoctorMode)}
        className="mb-6 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
      >
        {isDoctorMode ? 'Switch to Patient Mode' : 'Switch to Doctor Mode'}
      </button>

      {isDoctorMode ? (
      
        <div>
          <h1 className="text-2xl font-bold mb-4">Doctor Clinic Registration</h1>
          
          <div className="mb-4">
            <div className="mb-2">
              <label className="block mb-1">Doctor Name:</label>
              <input
                type="text"
                className="border p-2 w-full"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>
            
            <div className="mb-2">
              <label className="block mb-1">Clinic Address:</label>
              <div className="flex">
                <input
                  type="text"
                  className="border p-2 flex-grow"
                  value={clinicAddress}
                  onChange={(e) => setClinicAddress(e.target.value)}
                  placeholder="Enter clinic address"
                  onKeyPress={handleKeyPress}
                />
                <button 
                  onClick={handleAddressSearch}
                  className="bg-blue-500 text-white p-2 ml-2"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {isLoaded && (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={12}
              onClick={handleMapClick}
            >
              {selectedLocation && (
                <Marker
                  position={selectedLocation}
                />
              )}
            </GoogleMap>
          )}

          <button 
            onClick={handleDoctorSubmit}
            className="bg-green-500 text-white p-2 mt-4"
          >
            Register Clinic
          </button>
        </div>
      ) : (
       
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Find Doctors Near You</h1>

          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search location (e.g., JP Nagar)"
                className="border border-gray-300 rounded p-2 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                onClick={handlePatientSearch}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>

          <div className="mb-6 rounded-lg overflow-hidden shadow-md">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={12}
              >
                {doctors.map((doc) => (
                  <Marker
                    key={doc._id}
                    position={{
                      lat: doc.clinic.location.coordinates[1],
                      lng: doc.clinic.location.coordinates[0],
                    }}
                    title={`Dr. ${doc.name} - ${doc.clinic.address}`}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="bg-gray-100 h-96 flex items-center justify-center">
                <p>Loading map...</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Doctors Nearby:
            </h2>
            {doctors.length > 0 ? (
              <ul className="space-y-3">
                {doctors.map((doc) => (
                  <li
                    key={doc._id}
                    className="border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-medium text-lg text-blue-600">
                      Dr. {doc.name}
                    </h3>
                    <p className="text-gray-600">{doc.clinic.address}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">
                {isLoading
                  ? 'Searching for doctors...'
                  : 'No doctors found in this area. Try another location.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;