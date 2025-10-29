// Global variables
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let usageChart = null;
let adminUsageChart = null;
let selectedAdminUserId = null;

// --- UTILITY FUNCTIONS ---

// REQUIREMENT 4: Skips days with no data (non-continuous plotting)
function processHistoricalUsageData(usageData) {
    if (!usageData || usageData.length === 0) {
        return { labels: [], usageValues: [] };
    }

    const sortedData = [...usageData].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sortedData.map(entry => 
        new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    const usageValues = sortedData.map(entry => entry.usage);

    return { labels, usageValues };
}


function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// --- OTP AUTHENTICATION ---

let currentOTPEmail = '';
let currentOTPType = '';
let otpTimer = null;
let otpTimeLeft = 600; // 10 minutes in seconds

// Start OTP timer
function startOTPTimer() {
    clearInterval(otpTimer);
    otpTimeLeft = 600;
    
    otpTimer = setInterval(() => {
        otpTimeLeft--;
        
        const minutes = Math.floor(otpTimeLeft / 60);
        const seconds = otpTimeLeft % 60;
        
        const timerElement = document.getElementById('otp-timer');
        if (timerElement) {
            timerElement.textContent = `OTP expires in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (otpTimeLeft <= 0) {
            clearInterval(otpTimer);
            if (timerElement) {
                timerElement.textContent = 'OTP expired';
                timerElement.className = 'otp-error';
            }
        }
    }, 1000);
}

// Reset OTP timer
function resetOTPTimer() {
    clearInterval(otpTimer);
    const timerElement = document.getElementById('otp-timer');
    if (timerElement) {
        timerElement.textContent = '';
        timerElement.className = '';
    }
}

// Show OTP section
function showOTPSection(type) {
    const loginEmailForm = document.getElementById('login-email-form');
    const loginOTPSection = document.getElementById('login-otp-section');
    const registerEmailForm = document.getElementById('register-email-form');
    const registerOTPSection = document.getElementById('register-otp-section');
    
    if (type === 'login') {
        if (loginEmailForm) loginEmailForm.style.display = 'none';
        if (loginOTPSection) loginOTPSection.style.display = 'block';
        
        // Create timer element if it doesn't exist
        if (!document.getElementById('otp-timer')) {
            const timerDiv = document.createElement('div');
            timerDiv.id = 'otp-timer';
            timerDiv.className = 'otp-timer';
            loginOTPSection.insertBefore(timerDiv, loginOTPSection.querySelector('form'));
        }
    } else {
        if (registerEmailForm) registerEmailForm.style.display = 'none';
        if (registerOTPSection) registerOTPSection.style.display = 'block';
        
        // Create timer element if it doesn't exist
        if (!document.getElementById('otp-timer')) {
            const timerDiv = document.createElement('div');
            timerDiv.id = 'otp-timer';
            timerDiv.className = 'otp-timer';
            registerOTPSection.insertBefore(timerDiv, registerOTPSection.querySelector('form'));
        }
    }
    
    startOTPTimer();
}

// Hide OTP section
function hideOTPSection(type) {
    const loginEmailForm = document.getElementById('login-email-form');
    const loginOTPSection = document.getElementById('login-otp-section');
    const registerEmailForm = document.getElementById('register-email-form');
    const registerOTPSection = document.getElementById('register-otp-section');
    
    if (type === 'login') {
        if (loginEmailForm) loginEmailForm.style.display = 'block';
        if (loginOTPSection) loginOTPSection.style.display = 'none';
    } else {
        if (registerEmailForm) registerEmailForm.style.display = 'block';
        if (registerOTPSection) registerOTPSection.style.display = 'none';
    }
    
    resetOTPTimer();
}

// Login User - WITHOUT OTP
async function login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showToast('Login successful!', 'success');
            checkAuth();
        } else {
            showToast(data.message || 'Login failed. Check credentials.', 'error');
        }
    } catch (error) {
        showToast('Server error during login. Ensure the backend is running.', 'error');
    }
}

// Enhanced email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Send OTP for registration - WITH CLIENT-SIDE VALIDATION
async function sendRegisterOTP(e) {
  e.preventDefault();
  
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const role = document.getElementById('register-role').value;
  
  // Client-side validation
  if (!name || !email || !password) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  // Validate email format on client side
  if (!isValidEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }
  
  const button = e.target.querySelector('button[type="submit"]');
  const originalText = button.textContent;
  button.textContent = 'Sending OTP...';
  button.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/send-register-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentOTPEmail = email;
      currentOTPType = 'register';
      showOTPSection('register');
      showToast('OTP sent successfully to your email', 'success');
    } else {
      // Show specific error messages from server
      showToast(data.message || 'Failed to send OTP', 'error');
    }
  } catch (error) {
    showToast('Network error. Please check your connection and try again.', 'error');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}


// Verify OTP for registration
async function verifyRegisterOTP(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const otp = document.getElementById('register-otp').value;
    
    if (!otp || otp.length !== 6) {
        showToast('Please enter a valid 6-digit OTP', 'error');
        return;
    }
    
    const button = e.target.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Verifying...';
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-register-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, otp })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showToast('Registration successful!', 'success');
            checkAuth();
        } else {
            showToast(data.message || 'Invalid OTP', 'error');
        }
    } catch (error) {
        showToast('Server error during OTP verification', 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}


// Resend OTP
async function resendOTP() {
    if (!currentOTPEmail || !currentOTPType) {
        showToast('No email found for OTP resend', 'error');
        return;
    }
    
    const resendButton = document.getElementById(`${currentOTPType}-resend-otp`);
    if (resendButton) {
        resendButton.disabled = true;
        resendButton.textContent = 'Resending...';
    }
    
    try {
        const endpoint = currentOTPType === 'register' 
            ? '/auth/send-register-otp' 
            : '/auth/send-login-otp';
        
        const body = currentOTPType === 'register' 
            ? { email: currentOTPEmail }
            : { 
                email: currentOTPEmail, 
                password: document.getElementById('login-password').value 
            };
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('OTP resent successfully', 'success');
            startOTPTimer(); // Reset timer
        } else {
            showToast(data.message || 'Failed to resend OTP', 'error');
        }
    } catch (error) {
        showToast('Server error while resending OTP', 'error');
    } finally {
        if (resendButton) {
            resendButton.disabled = false;
            resendButton.textContent = 'Resend OTP';
        }
    }
}

// Reset OTP flow when switching between login/register
function resetOTPFlow() {
    currentOTPEmail = '';
    currentOTPType = '';
    resetOTPTimer();
    
    hideOTPSection('login');
    hideOTPSection('register');
    
    // Clear OTP inputs
    const loginOtpInput = document.getElementById('login-otp');
    const registerOtpInput = document.getElementById('register-otp');
    
    if (loginOtpInput) loginOtpInput.value = '';
    if (registerOtpInput) registerOtpInput.value = '';
}


async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                currentUser = data.user;
                if (currentUser.role === 'admin') {
                    showAdminDashboard();
                } else {
                    showUserDashboard();
                }
                return;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
    showAuthScreen();
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    showAuthScreen();
}

function showAuthScreen() {
    const authScreen = document.getElementById('auth-screen');
    const userDash = document.getElementById('user-dashboard');
    const adminDash = document.getElementById('admin-dashboard');

    if (authScreen) authScreen.style.display = 'flex';
    if (userDash) userDash.style.display = 'none';
    if (adminDash) adminDash.style.display = 'none';

    document.getElementById('login-form')?.reset();
    document.getElementById('register-form')?.reset();
}

function showUserDashboard() {
    const authScreen = document.getElementById('auth-screen');
    const userDash = document.getElementById('user-dashboard');
    const adminDash = document.getElementById('admin-dashboard');

    if (authScreen) authScreen.style.display = 'none';
    if (userDash) userDash.style.display = 'block';
    if (adminDash) adminDash.style.display = 'none';
    
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${currentUser.name}!`;
    
    initializeUserChart();
    getDashboardData();
}

// REQUIREMENT 3: Admin only sees user list
function showAdminDashboard() {
    const authScreen = document.getElementById('auth-screen');
    const userDash = document.getElementById('user-dashboard');
    const adminDash = document.getElementById('admin-dashboard');

    if (authScreen) authScreen.style.display = 'none';
    if (userDash) userDash.style.display = 'none';
    if (adminDash) adminDash.style.display = 'block';

    const adminWelcomeMsg = document.getElementById('admin-welcome-message');
        if (adminWelcomeMsg && currentUser) {
            adminWelcomeMsg.textContent = `Welcome, ${currentUser.name}!`;
        }
    
    loadAdminUserList();    // Fetch and render the list of users
    getAdminList();     // Fetch and render the list of admins
}



function updateStats(stats) {
    console.log('Updating stats:', stats);
    
    const todayCard = document.getElementById('today-card');
    const todayUsageSpan = document.getElementById('today-usage');
    const weeklyCard = document.getElementById('weekly-card');
    const weeklyUsage = document.getElementById('weekly-usage');
    const monthlyCard = document.getElementById('monthly-card');
    const monthlyUsage = document.getElementById('monthly-usage');
    const thresholdDisplay = document.getElementById('threshold-display');
    
    // Update numerical values
    if (todayUsageSpan) todayUsageSpan.textContent = `${stats.today.toFixed(1)}L`;
    if (weeklyUsage) weeklyUsage.textContent = `${stats.weekly.toFixed(1)}L`;
    if (monthlyUsage) monthlyUsage.textContent = `${stats.monthly.toFixed(1)}L`;
    if (thresholdDisplay) thresholdDisplay.textContent = `${currentUser.dailyThreshold}L`;
    
    // Calculate thresholds for weekly and monthly
    const dailyThreshold = currentUser.dailyThreshold || 200;
    const weeklyThreshold = dailyThreshold * 7;
    const monthlyThreshold = dailyThreshold * 30;

    console.log('Thresholds:', { dailyThreshold, weeklyThreshold, monthlyThreshold });
    console.log('Card elements:', { todayCard, weeklyCard, monthlyCard });
    
    // Update card colors based on thresholds
    updateCardColor(todayCard, stats.today, dailyThreshold, 'today');
    updateCardColor(weeklyCard, stats.weekly, weeklyThreshold, 'weekly');
    updateCardColor(monthlyCard, stats.monthly, monthlyThreshold, 'monthly');
}

function updateAdminStats(stats, userThreshold) {
    const todayCard = document.getElementById('admin-today-card');
    const todayUsageSpan = document.getElementById('admin-today-usage');
    const weeklyCard = document.getElementById('admin-weekly-card');
    const weeklyUsage = document.getElementById('admin-weekly-usage');
    const monthlyCard = document.getElementById('admin-monthly-card');
    const monthlyUsage = document.getElementById('admin-monthly-usage');
    const thresholdDisplay = document.getElementById('admin-threshold-display');
    
    // Update numerical values
    if (todayUsageSpan) todayUsageSpan.textContent = `${stats.today.toFixed(1)}L`;
    if (weeklyUsage) weeklyUsage.textContent = `${stats.weekly.toFixed(1)}L`;
    if (monthlyUsage) monthlyUsage.textContent = `${stats.monthly.toFixed(1)}L`;
    if (thresholdDisplay) thresholdDisplay.textContent = `${userThreshold}L`;
    
    // Calculate thresholds for weekly and monthly
    const dailyThreshold = userThreshold || 200;
    const weeklyThreshold = dailyThreshold * 7;
    const monthlyThreshold = dailyThreshold * 30;
    
    // Update card colors based on thresholds
    updateAdminUserCardColors(stats, dailyThreshold, weeklyThreshold, monthlyThreshold);

    // Update card colors based on thresholds
    updateCardColor(todayCard, stats.today, dailyThreshold, 'today');
    updateCardColor(weeklyCard, stats.weekly, weeklyThreshold, 'weekly');
    updateCardColor(monthlyCard, stats.monthly, monthlyThreshold, 'monthly');
}

// NEW: Improved color coding for admin user dashboard
function updateAdminUserCardColors(stats, dailyThreshold, weeklyThreshold, monthlyThreshold) {
    const todayCard = document.getElementById('admin-user-today-card');
    const weeklyCard = document.getElementById('admin-user-weekly-card');
    const monthlyCard = document.getElementById('admin-user-monthly-card');
    
    // Reset all cards first
    [todayCard, weeklyCard, monthlyCard].forEach(card => {
        if (card) {
            card.classList.remove('exceeded', 'warning', 'good');
        }
    });
    
    // Today's usage color coding
    if (todayCard) {
        if (stats.today > dailyThreshold) {
            todayCard.classList.add('exceeded');
        } else if (stats.today > dailyThreshold * 0.8) {
            todayCard.classList.add('warning');
        } else {
            todayCard.classList.add('good');
        }
    }
    
    // Weekly usage color coding
    if (weeklyCard) {
        if (stats.weekly > weeklyThreshold) {
            weeklyCard.classList.add('exceeded');
        } else if (stats.weekly > weeklyThreshold * 0.8) {
            weeklyCard.classList.add('warning');
        } else {
            weeklyCard.classList.add('good');
        }
    }
    
    // Monthly usage color coding
    if (monthlyCard) {
        if (stats.monthly > monthlyThreshold) {
            monthlyCard.classList.add('exceeded');
        } else if (stats.monthly > monthlyThreshold * 0.8) {
            monthlyCard.classList.add('warning');
        } else {
            monthlyCard.classList.add('good');
        }
    }
}

// New function to update card colors
function updateCardColor(cardElement, usage, threshold, type) {
    if (!cardElement) {
        console.error(`Card element not found for type: ${type}`);
        return;
    }
    
    console.log(`Updating card ${type}: usage=${usage}, threshold=${threshold}`);
    
    // Remove all color classes
    cardElement.classList.remove('exceeded', 'warning', 'good');
    
    const h2Tag = cardElement.querySelector('h2');
    
    if (usage > threshold) {
        // Exceeded threshold
        cardElement.classList.add('exceeded');
        if (h2Tag) {
            if (type === 'today') h2Tag.textContent = 'Threshold Exceeded!';
            else if (type === 'weekly') h2Tag.textContent = 'Weekly Limit Exceeded!';
            else if (type === 'monthly') h2Tag.textContent = 'Monthly Limit Exceeded!';
        }
        console.log(`Card ${type}: EXCEEDED (${usage} > ${threshold})`);
    } else if (usage > threshold * 0.8) {
        // Approaching threshold (80-100%)
        cardElement.classList.add('warning');
        if (h2Tag) {
            if (type === 'today') h2Tag.textContent = 'Approaching Limit';
            else if (type === 'weekly') h2Tag.textContent = 'Weekly Limit Warning';
            else if (type === 'monthly') h2Tag.textContent = 'Monthly Limit Warning';
        }
        console.log(`Card ${type}: WARNING (${usage} > ${threshold * 0.8})`);
    } else {
        // Within safe limits
        cardElement.classList.add('good');
        if (h2Tag) {
            if (type === 'today') h2Tag.textContent = 'Liters Used Today';
            else if (type === 'weekly') h2Tag.textContent = 'Weekly Usage';
            else if (type === 'monthly') h2Tag.textContent = 'Monthly Usage';
        }
        console.log(`Card ${type}: GOOD (${usage} <= ${threshold * 0.8})`);
    }
}

/*
// Update card colors for admin user dashboard
function updateAdminUserCardColors(stats, userThreshold) {
    const todayCard = document.getElementById('admin-user-today-card');
    const weeklyCard = document.getElementById('admin-user-weekly-card');
    const monthlyCard = document.getElementById('admin-user-monthly-card');
    
    // Calculate thresholds for weekly and monthly
    const dailyThreshold = userThreshold || 200;
    const weeklyThreshold = dailyThreshold * 7;
    const monthlyThreshold = dailyThreshold * 30;
    
    // Update card colors based on thresholds
    updateCardColor(todayCard, stats.today, dailyThreshold, 'today');
    updateCardColor(weeklyCard, stats.weekly, weeklyThreshold, 'weekly');
    updateCardColor(monthlyCard, stats.monthly, monthlyThreshold, 'monthly');
}*/

function updateTips(tips) {
    const tipsList = document.getElementById('conservation-tips');
    if (tipsList) {
        tipsList.innerHTML = '';
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsList.appendChild(li);
        });
    }
}

function updateChart(usageData) {
    if (usageChart) {
        const { labels, usageValues } = processHistoricalUsageData(usageData);
        
        const threshold = currentUser ? currentUser.dailyThreshold : 200;
        const thresholdValues = labels.map(() => threshold);
        
        usageChart.data.labels = labels;
        usageChart.data.datasets[0].data = usageValues;
        usageChart.data.datasets[1].data = thresholdValues;
        usageChart.data.datasets[1].label = `Threshold (${threshold}L)`;
        
        usageChart.update('none');
    }
}

function updateAdminChart(usageData, threshold) {
    if (adminUsageChart) {
        const { labels, usageValues } = processHistoricalUsageData(usageData);
        
        const thresholdValues = labels.map(() => threshold);
        
        adminUsageChart.data.labels = labels;
        adminUsageChart.data.datasets[0].data = usageValues;
        adminUsageChart.data.datasets[1].data = thresholdValues;
        adminUsageChart.data.datasets[1].label = `Threshold (${threshold}L)`;
        
        adminUsageChart.update('none');
    }
}

function updateAlerts(alerts) {
    const alertsContainer = document.getElementById('alerts-container');
    if (alertsContainer) {
        alertsContainer.innerHTML = '';
        
        if (alerts.length === 0) {
            alertsContainer.innerHTML = '<p class="no-alerts">No active alerts. Keep up the great work!</p>';
            return;
        }

        alerts.forEach(alert => {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${alert.type.includes('exceeded') ? 'danger' : 'warning'}`;
            alertDiv.innerHTML = `
                <p>${alert.message}</p>
                <button onclick="dismissAlert('${alert._id}')">Dismiss</button>
            `;
            alertsContainer.appendChild(alertDiv);
        });
    }
}

// --- DATA FETCHING & ACTIONS ---

async function getDashboardData() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('No authentication token found. Please log in again.', 'error');
        return;
    }

    try {
        console.log('Fetching dashboard data...');
        
        const response = await fetch(`${API_BASE_URL}/usage`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Dashboard Data Failed - Status: ${response.status}, Response: ${errorText}`);
            
            if (response.status === 401) {
                showToast('Session expired. Please log in again.', 'error');
                logout();
                return;
            }
            
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Dashboard data result:', result);
        
        if (result.success) {
            updateStats(result.data.statistics);
            updateTips(result.data.tips);
            updateChart(result.data.usage);
            getAlerts();
        } else {
            showToast(result.message || 'Failed to load dashboard data.', 'error');
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showToast('Cannot connect to server. Please ensure the backend is running on localhost:5000', 'error');
        } else {
            showToast('Server error while loading data. Please check your backend.', 'error');
        }
    }
}

async function getAlerts() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/usage/alerts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            updateAlerts(result.data);
        } else {
            console.error('Failed to load alerts.');
        }
    } catch (error) {
        console.error('Error fetching alerts:', error);
    }
}

async function dismissAlert(alertId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            showToast('Alert dismissed.', 'success');
            getAlerts();
        } else {
            showToast(result.message || 'Failed to dismiss alert.', 'error');
        }
    } catch (error) {
        showToast('Server error while dismissing alert.', 'error');
    }
}

// FIX: Improved error checking for API response
async function addUsage(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const dateInput = document.getElementById('usage-date');
    const usage = document.getElementById('usage-amount')?.value;

    if (!dateInput || !usage || isNaN(parseFloat(usage))) {
        showToast('Please enter a valid date and usage amount.', 'warning');
        return;
    }

    const date = dateInput.value;
    const selectedDate = new Date(date);
    const today = new Date();

    // Normalize both dates to midnight for accurate comparison
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // FIX: Allow today's date and past dates, but not future dates
    if (selectedDate > today) {
        showToast('Cannot record water usage for a future date.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/usage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ date, usage })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Add Usage Failed - Status: ${response.status}, Response: ${errorText}`);
            throw new Error('API Request Failed');
        }
        
        const result = await response.json();

        if (result.success) {
            showToast(`Usage ${result.action} successfully!`, 'success');
            document.getElementById('add-usage-form').reset();
            // Reset to today's date after successful submission
            initializeDateInput();
            getDashboardData(); 
        } else {
            showToast(result.message || 'Failed to add usage.', 'error');
        }
    } catch (error) {
        console.error('Error adding usage:', error);
        showToast('Server error while adding usage. Check console for details.', 'error');
    }
}

// REQUIREMENT 2: Data Simulation
// FIX: Improved error checking for API response
async function simulateData() {
    const token = localStorage.getItem('token');
    if (!token) return showToast('Please log in first.', 'error');

    try {
        showToast('Generating simulated data...', 'warning');
        const response = await fetch(`${API_BASE_URL}/usage/simulate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Simulate Data Failed - Status: ${response.status}, Response: ${errorText}`);
            throw new Error('API Request Failed');
        }

        const result = await response.json();

        if (result.success) {
            showToast(result.message || 'Data simulation complete! Refreshing dashboard.', 'success');
            getDashboardData();
        } else {
            showToast(result.message || 'Data simulation failed.', 'error');
        }
    } catch (error) {
        console.error('Error during data simulation:', error);
        showToast('Server error during data simulation. Check console for details.', 'error');
    }
}


// --- ADMIN LOGIC (REQUIREMENT 3) ---

async function loadAdminUserList() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            // Filter to only display 'user' role clients (Requirement 3)
            const userClients = result.data.filter(user => user.role === 'user');
            renderAdminUserList(userClients);
        } else {
            showToast(result.message || 'Failed to load user list.', 'error');
        }
    } catch (error) {
        showToast('Server error loading admin user list.', 'error');
    }
}

// Admin: Delete User
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user?')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            showToast(`User ID ${userId} deleted successfully.`, 'success');
            loadAdminUserList(); // Reload list
        } else {
            showToast(result.message || 'Failed to delete user.', 'error');
        }
    } catch (error) {
        showToast('Server error during user deletion.', 'error');
    }
}

// Admin: Prompt for User Update (Simplified to threshold update)
function promptUpdateUser(userId, currentThreshold) {
    const newThreshold = prompt(`Enter new daily water threshold (current: ${currentThreshold}L):`);
    
    if (newThreshold === null || newThreshold.trim() === "") {
        return; // Cancelled
    }

    const parsedThreshold = parseFloat(newThreshold);
    if (!isNaN(parsedThreshold) && parsedThreshold > 0) {
        updateUserThreshold(userId, parsedThreshold);
    } else {
        showToast('Invalid threshold value. Please enter a number greater than zero.', 'error');
    }
}

// Admin: Update User Threshold
async function updateUserThreshold(userId, dailyThreshold) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
         const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ dailyThreshold: dailyThreshold })
        });
        const result = await response.json();
         if (result.success) {
            showToast('User threshold updated successfully!', 'success');
            loadAdminUserList(); // Refresh list to show change
        } else {
            showToast(result.message || 'Failed to update user.', 'error');
        }
    } catch (error) {
        showToast('Server error during user update.', 'error');
    }
}

function renderAdminUserList(users) {
    const userListContainer = document.getElementById('admin-user-list');
    if (userListContainer) {
        userListContainer.innerHTML = '';

        if (users.length === 0) {
            userListContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 4.5px;">No users registered yet</p>';
            return;
        }
        
        users.forEach(user => {
            const userRow = document.createElement('div');
            userRow.className = 'admin-user-row';
            userRow.innerHTML = `
                <div>${user.name} (${user.email})</div>
                <div>
                    Threshold: ${user.dailyThreshold}L | Today: ${user.statistics.today.toFixed(1)}L
                </div>
                <div>
                    <button onclick="viewUserDashboard('${user._id}', '${user.name}')" class="btn-small btn-view">View Usage</button>
                    <button onclick="promptUpdateUser('${user._id}', ${user.dailyThreshold})" class="btn-small btn-info">Update</button>
                    <button onclick="deleteUser('${user._id}')" class="btn-small btn-danger-admin">Delete</button>
                </div>
            `;
            userListContainer.appendChild(userRow);
        });
    }
}

// Function to fetch the list of admin users
async function getAdminList() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/list-admins`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            renderAdminList(result.admins);
        } else {
            showToast(result.message || 'Failed to fetch admin list.', 'error');
        }
    } catch (error) {
        console.error('Error fetching admin list:', error);
        showToast('Server error while fetching admin list.', 'error');
    }
}

// Function to render the list of admin users
function renderAdminList(admins) {
    const adminListContainer = document.getElementById('admin-list');
    if (!adminListContainer) return;

    adminListContainer.innerHTML = '';

    if (!admins || admins.length === 0) {
        adminListContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d; background-color: #e9ecef; border-radius: 6px;">
                <p>No other registered admin accounts found.</p>
            </div>
        `;
        return;
    }

    admins.forEach(adminUser => {
        const adminRow = document.createElement('div');
        // Use the same class name for consistent styling
        adminRow.className = 'admin-user-row'; 
        
        // IMPORTANT: No buttons are included here as per your request
        adminRow.innerHTML = `
            <div align="center" >${adminUser.name} </div>
            <div>
                ${adminUser.email}
            </div>
            <div>
                </div>
        `;
        adminListContainer.appendChild(adminRow);
    });
}

// FIX: Added explicit token check and better error handling for the API call
async function viewUserDashboard(userId, userName) {
    selectedAdminUserId = userId;
    const dashboardView = document.getElementById('admin-dashboard-view');
    const listView = document.getElementById('admin-user-list-view');
    const adminUserName = document.getElementById('admin-user-name');

    if (dashboardView && listView) {
        dashboardView.style.display = 'block';
        listView.style.display = 'none';
        if (adminUserName) adminUserName.textContent = userName;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Authentication token missing. Please re-login.', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/admin/user-dashboard/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`View Dashboard Failed - Status: ${response.status}, Response: ${errorText}`);
            throw new Error('API Request Failed');
        }
        
        const result = await response.json();

        if (result.success) {
            console.log('User dashboard data:', result.data); // Debug log
            
            // Update stats for the viewed user - FIXED IDs
            document.getElementById('admin-user-today-usage').textContent = `${result.data.statistics.today.toFixed(1)}L`;
            document.getElementById('admin-user-weekly-usage').textContent = `${result.data.statistics.weekly.toFixed(1)}L`;
            document.getElementById('admin-user-monthly-usage').textContent = `${result.data.statistics.monthly.toFixed(1)}L`;
            document.getElementById('admin-user-threshold-display').textContent = `${result.data.user.dailyThreshold}L`;
            
            updateAdminStats(result.data.statistics, result.data.user.dailyThreshold);

            // Update tips
            const adminTipsList = document.getElementById('admin-conservation-tips');
            if (adminTipsList) {
                adminTipsList.innerHTML = '';
                result.data.tips.forEach(tip => {
                    const li = document.createElement('li');
                    li.textContent = tip;
                    adminTipsList.appendChild(li);
                });
            }

            // Update alerts
            const adminAlertsContainer = document.getElementById('admin-alerts-container');
            if (adminAlertsContainer) {
                adminAlertsContainer.innerHTML = '';
                if (result.data.alerts.length === 0) {
                     adminAlertsContainer.innerHTML = '<p class="no-alerts">No active alerts.</p>';
                } else {
                    result.data.alerts.forEach(alert => {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = `alert alert-${alert.type.includes('exceeded') ? 'danger' : 'warning'}`;
                        alertDiv.innerHTML = `<p>${alert.message}</p>`;
                        adminAlertsContainer.appendChild(alertDiv);
                    });
                }
            }

            updateAdminChart(result.data.usage, result.data.user.dailyThreshold);

        } else {
            showToast(result.message || 'Failed to load user dashboard.', 'error');
        }
    } catch (error) {
        console.error('Error fetching admin user dashboard:', error);
        showToast('Server error while loading user dashboard. Check console for details.', 'error');
        
        // Return to admin list on critical failure
        if (dashboardView && listView) {
            dashboardView.style.display = 'none';
            listView.style.display = 'block';
        }
    }
}


function returnToAdminList() {
    const dashboardView = document.getElementById('admin-dashboard-view');
    const listView = document.getElementById('admin-user-list-view');

    if (dashboardView && listView) {
        dashboardView.style.display = 'none';
        listView.style.display = 'block';
        loadAdminUserList();
    }
}

function initializeDateInput() {
    const dateInput = document.getElementById('usage-date');
    if (dateInput) {
        const today = new Date();
        const currentYear = today.getFullYear();
        
        // Set min date to January 1st of current year
        const minDate = `${currentYear}-01-01`;
        
        // Set max date to today
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const maxDate = `${yyyy}-${mm}-${dd}`;
        
        // Set date constraints
        dateInput.setAttribute('min', minDate);
        dateInput.setAttribute('max', maxDate);
        dateInput.value = maxDate; // Default to today
        
        // Add input event listener to prevent year change
        dateInput.addEventListener('input', function() {
            const selectedDate = new Date(this.value);
            const selectedYear = selectedDate.getFullYear();
            
            if (selectedYear !== currentYear) {
                showToast('You can only add data for the current year.', 'error');
                this.value = maxDate; // Reset to today
            }
        });
    }
}

function initializeUserChart() {
    const ctx = document.getElementById('usageChart');
    if (!ctx) {
        console.error('Usage chart canvas not found');
        return;
    }

    // Destroy existing chart if it exists
    if (usageChart) {
        usageChart.destroy();
    }

    usageChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Daily Usage (L)',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Threshold',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Water Usage (Liters)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function initializeChart(ctx, isUserChart = true) {
    const chartConfig = {
        type: 'line',
        data: {
            labels: [], 
            datasets: [
                {
                    label: 'Daily Usage (L)',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0,
                    fill: false,
                    spanGaps: false
                },
                {
                    label: 'Threshold',
                    data: [],
                    borderColor: '#dc3545',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Water Usage (Liters)'
                    }
                },
                x: {
                    type: 'category', 
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    };

    if (isUserChart) {
        usageChart = new Chart(ctx, chartConfig);
    } else {
        adminUsageChart = new Chart(ctx, chartConfig);
    }
}

// Profile Management Functions
function showEditProfileModal() {
    createProfileModal();
    const modal = document.getElementById('profile-modal');
    if (modal) {
        document.getElementById('profile-name').value = currentUser.name;
        document.getElementById('profile-email').value = currentUser.email;
        
        // HIDE THRESHOLD FIELD FOR ADMINS
        const thresholdGroup = document.getElementById('profile-threshold-group');
        if (thresholdGroup) {
            if (currentUser.role === 'admin') {
                thresholdGroup.style.display = 'none';
            } else {
                thresholdGroup.style.display = 'block';
                document.getElementById('profile-threshold').value = currentUser.dailyThreshold;
            }
        }
        
        modal.style.display = 'flex';
    }
}

function createProfileModal() {
    const modalHTML = `
    <div id="profile-modal" class="profile-modal">
        <div class="profile-modal-content">
            <h2>Edit Profile</h2>
            <form id="profile-form">
                <div class="profile-form-group">
                    <label for="profile-name">Name</label>
                    <input type="text" id="profile-name" required>
                </div>
                <div class="profile-form-group">
                    <label for="profile-email">Email</label>
                    <input type="email" id="profile-email" required>
                </div>
                <div class="profile-form-group" id="profile-threshold-group">
                    <label for="profile-threshold">Daily Water Threshold (Liters)</label>
                    <input type="number" id="profile-threshold" min="0" max="2000" step="50" required>
                </div>
                <div class="profile-form-group">
                    <label for="profile-password">New Password (leave blank to keep current)</label>
                    <input type="password" id="profile-password" placeholder="Enter new password">
                </div>
            </form>
            
            <div class="danger-zone">
                <h3>Think Before You Click</h3>
                <p>Once you delete your account, there is no going back. Please be certain.</p>
                <button onclick="deleteAccount()" class="btn-danger">Delete My Account</button>
            </div>
            
            <div class="profile-modal-actions">
                <button onclick="closeProfileModal()" class="btn-secondary">Cancel</button>
                <button onclick="updateProfile()" class="btn-primary">Save Changes</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}


function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

async function updateProfile() {
  const token = localStorage.getItem('token');
  if (!token) return;

  const name = document.getElementById('profile-name').value;
  const email = document.getElementById('profile-email').value;
  const password = document.getElementById('profile-password').value;

  const profileData = { name, email };
  if (currentUser.role !== 'admin') {
    const dailyThreshold = document.getElementById('profile-threshold').value;
    if (dailyThreshold) profileData.dailyThreshold = parseFloat(dailyThreshold);
  }

  if(password) profileData.password = password;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    const result = await response.json();

    if (result.success) {
      currentUser = result.user;
      showToast('Profile updated successfully!', 'success');
      closeProfileModal();
      
      // Update welcome messages on both dashboards
      const welcomeMsg = document.getElementById('welcome-message');
      const adminWelcomeMsg = document.getElementById('admin-welcome-message');
      
      if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${currentUser.name}!`;
      if (adminWelcomeMsg) adminWelcomeMsg.textContent = `Welcome, ${currentUser.name}!`;
      
      // Refresh dashboard data
      if (currentUser.role === 'admin') {
        loadAdminUserList();
      } else {
        getDashboardData();
      }
    } else {
      showToast(result.message || 'Failed to update profile.', 'error');
    }
  } catch (error) {
    showToast('Server error while updating profile.', 'error');
  }
}

async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.')) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/account`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            showToast('Account deleted successfully.', 'success');
            logout();
        } else {
            showToast(result.message || 'Failed to delete account.', 'error');
        }
    } catch (error) {
        showToast('Server error while deleting account.', 'error');
    }
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('profile-modal');
    if (modal && e.target === modal) {
        closeProfileModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial UI Setup 
    const userDash = document.getElementById('user-dashboard');
    const adminDash = document.getElementById('admin-dashboard');
    const authScreen = document.getElementById('auth-screen');

    if (userDash) userDash.style.display = 'none';
    if (adminDash) adminDash.style.display = 'none';
    if (authScreen) authScreen.style.display = 'flex';

    // FIX 1: Initialize date input with max constraint
    initializeDateInput();

    // FIX 2: Edit Profile button added for both user and admin.
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const adminEditProfileBtn = document.getElementById('admin-edit-profile-btn');
    
    if (editProfileBtn) editProfileBtn.addEventListener('click', showEditProfileModal);
    if (adminEditProfileBtn) adminEditProfileBtn.addEventListener('click', showEditProfileModal);
    
    // 2. Initialize charts 
    const userCtx = document.getElementById('usageChart');
    if (userCtx) {
        initializeChart(userCtx.getContext('2d'), true);
    }
    const adminCtx = document.getElementById('adminUsageChart');
    if (adminCtx) {
        initializeChart(adminCtx.getContext('2d'), false);
    }
    
    // 3. Attach Auth Form Listeners 
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const loginFormDiv = document.getElementById('login-form-div');
    const registerFormDiv = document.getElementById('register-form-div');

    // SET INITIAL FORM VISIBILITY
    if (loginFormDiv) loginFormDiv.style.display = 'block';
    if (registerFormDiv) registerFormDiv.style.display = 'none';


    if (showRegisterBtn && loginFormDiv && registerFormDiv) {
        showRegisterBtn.addEventListener('click', () => {
            loginFormDiv.style.display = 'none';
            registerFormDiv.style.display = 'block';
            resetOTPFlow();
        });
    }
    if (showLoginBtn && loginFormDiv && registerFormDiv) {
        showLoginBtn.addEventListener('click', () => {
            registerFormDiv.style.display = 'none';
            loginFormDiv.style.display = 'block';
            resetOTPFlow();
        });
    }
    
    // NEW CODE

    // Login form listener - WITHOUT OTP
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', login);

    // Register form listeners
    const registerEmailForm = document.getElementById('register-email-form');
    const registerOtpForm = document.getElementById('register-otp-form');
    const registerResendOtp = document.getElementById('register-resend-otp');

    if (registerEmailForm) registerEmailForm.addEventListener('submit', sendRegisterOTP);
    if (registerOtpForm) registerOtpForm.addEventListener('submit', verifyRegisterOTP);
    if (registerResendOtp) registerResendOtp.addEventListener('click', resendOTP);

    // Update the show/hide button listeners to reset OTP flow
    if (showRegisterBtn && loginFormDiv && registerFormDiv) {
        showRegisterBtn.addEventListener('click', () => {
            loginFormDiv.style.display = 'none';
            registerFormDiv.style.display = 'block';
            resetOTPFlow();
        });
    }
    if (showLoginBtn && loginFormDiv && registerFormDiv) {
        showLoginBtn.addEventListener('click', () => {
            registerFormDiv.style.display = 'none';
            loginFormDiv.style.display = 'block';
            resetOTPFlow();
        });
    }
    
    // 4. Attach Dashboard Listeners 
    const logoutBtn = document.getElementById('logout-btn');
    const addUsageForm = document.getElementById('add-usage-form');
    const simulateBtn = document.getElementById('simulate-data-btn');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    const adminBackBtn = document.getElementById('admin-back-btn');

    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (addUsageForm) addUsageForm.addEventListener('submit', addUsage);
    if (simulateBtn) simulateBtn.addEventListener('click', simulateData);
    
    // 5. Attach Admin Listeners
    if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', logout);
    if (adminBackBtn) adminBackBtn.addEventListener('click', returnToAdminList);
    
    // 6. Start the authentication flow
    checkAuth();
});