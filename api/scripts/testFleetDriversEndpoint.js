require('dotenv').config();
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

// Mock a simple version of the routes to test ordering
const app = express();

// Simulate the route ordering issue and fix
app.get('/fleet/available-drivers', (req, res) => {
  res.json({ success: true, message: 'Available drivers endpoint' });
});

app.get('/fleet/:id', (req, res) => {
  // Simulate ObjectId validation
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed',
      errors: [{ field: 'id', message: 'Invalid vehicle ID', value: req.params.id }]
    });
  }
  res.json({ success: true, message: 'Vehicle details', id: req.params.id });
});

async function testRouteOrdering() {
  console.log('Testing route ordering...');
  
  // Test 1: Available drivers endpoint
  console.log('\n📝 Test 1: GET /fleet/available-drivers');
  try {
    const response1 = await request(app).get('/fleet/available-drivers');
    console.log('✅ Success:', response1.body);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 2: Valid vehicle ID
  console.log('\n📝 Test 2: GET /fleet/507f1f77bcf86cd799439011 (valid ObjectId)');
  try {
    const response2 = await request(app).get('/fleet/507f1f77bcf86cd799439011');
    console.log('✅ Success:', response2.body);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test 3: Invalid vehicle ID (what was happening before)
  console.log('\n📝 Test 3: GET /fleet/invalid-id');
  try {
    const response3 = await request(app).get('/fleet/invalid-id');
    console.log('❌ Expected error:', response3.body);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testRouteOrdering().catch(console.error);