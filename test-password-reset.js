// Test script for password reset functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testPasswordReset() {
    try {
        console.log('🧪 Testing Password Reset Functionality...\n');

        // Test 1: Forgot Password
        console.log('1. Testing forgot password...');
        const forgotResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
            email: 'test@example.com'
        });
        console.log('✅ Forgot password response:', forgotResponse.data);

        // Test 2: Reset Password (with dummy token)
        console.log('\n2. Testing reset password...');
        try {
            const resetResponse = await axios.post(`${BASE_URL}/auth/reset-password/dummy-token`, {
                password: 'newpassword123'
            });
            console.log('✅ Reset password response:', resetResponse.data);
        } catch (error) {
            console.log('❌ Reset password error (expected):', error.response?.data?.message || error.message);
        }

        console.log('\n🎉 Password reset functionality test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testPasswordReset();
