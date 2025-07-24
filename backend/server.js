require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Client } = require('@googlemaps/google-maps-services-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected!"))
  .catch(err => console.error(err));


const doctorSchema = new mongoose.Schema({
  name: String,
  clinic: {
    address: String,
    location: { type: { type: String, default: 'Point' }, coordinates: [Number] }
  }
});
doctorSchema.index({ "clinic.location": "2dsphere" });
const Doctor = mongoose.model('Doctor', doctorSchema);


const mapsClient = new Client({});


app.post('/api/doctors', async (req, res) => {
  const { name, address } = req.body;
  try {
    const response = await mapsClient.geocode({ params: { address, key: process.env.GOOGLE_MAPS_API_KEY } });
    const { lat, lng } = response.data.results[0].geometry.location;
    const doctor = new Doctor({
      name,
      clinic: { address, location: { coordinates: [lng, lat] } }
    });
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ error: "Failed to add doctor" });
  }
});

app.get('/api/doctors/nearby', async (req, res) => {
  const { lat, lng, maxDistance = 5000 } = req.query;
  try {
    const doctors = await Doctor.find({
      "clinic.location": {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance)
        }
      }
    });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));