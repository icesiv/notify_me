<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="NotifyMe Interactive API playground, documentation, and test console. Test registration, authentication, and client API endpoints in real-time.">
    <title>NotifyMe API Playground</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #07050f;
            --card-bg: rgba(23, 20, 38, 0.7);
            --card-border: rgba(124, 58, 237, 0.2);
            --accent-primary: #7C3AED;
            --accent-secondary: #A78BFA;
            --text-primary: #FFFFFF;
            --text-secondary: #94A3B8;
            --success: #10B981;
            --error: #EF4444;
            --warning: #F59E0B;
            --font-main: 'Outfit', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: var(--font-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
            position: relative;
        }

        /* Glowing background blobs */
        .blob {
            position: absolute;
            width: 500px;
            height: 500px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0) 70%);
            filter: blur(80px);
            z-index: -1;
            pointer-events: none;
        }
        .blob-1 {
            top: -100px;
            left: -100px;
        }
        .blob-2 {
            bottom: -100px;
            right: -100px;
            background: radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, rgba(167, 139, 250, 0) 70%);
        }

        /* Header Styles */
        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 40px;
            background: rgba(11, 9, 20, 0.5);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .logo-badge {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: var(--accent-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 20px;
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
            color: #fff;
        }

        .title-group h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
            background: linear-gradient(135deg, #fff 0%, var(--accent-secondary) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .title-group p {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 2px;
        }

        .env-badge {
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: 8px;
            background: rgba(167, 139, 250, 0.1);
            border: 1px solid rgba(167, 139, 250, 0.2);
            color: var(--accent-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .env-badge::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--success);
            box-shadow: 0 0 8px var(--success);
        }

        /* Layout Container */
        .layout-container {
            display: flex;
            flex: 1;
            width: 100%;
            max-width: 1600px;
            margin: 0 auto;
            padding: 40px;
            gap: 32px;
        }

        /* Sidebar navigation */
        .sidebar {
            width: 320px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            flex-shrink: 0;
        }

        .section-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 24px;
            backdrop-filter: blur(16px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .sidebar h2 {
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--accent-secondary);
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .route-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            list-style: none;
        }

        .route-item button {
            width: 100%;
            text-align: left;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 14px 16px;
            color: var(--text-primary);
            font-family: var(--font-main);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .route-item button:hover {
            background: rgba(124, 58, 237, 0.08);
            border-color: rgba(124, 58, 237, 0.3);
            transform: translateX(4px);
        }

        .route-item.active button {
            background: rgba(124, 58, 237, 0.15);
            border-color: var(--accent-primary);
            box-shadow: 0 0 15px rgba(124, 58, 237, 0.15);
        }

        .method-badge {
            font-size: 10px;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            text-transform: uppercase;
            font-family: var(--font-mono);
            letter-spacing: 0.5px;
        }

        .method-badge.post {
            background: rgba(124, 58, 237, 0.2);
            color: var(--accent-secondary);
            border: 1px solid rgba(124, 58, 237, 0.3);
        }

        .method-badge.get {
            background: rgba(16, 185, 129, 0.2);
            color: var(--success);
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        /* Main details area */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 32px;
        }

        .endpoint-header {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 24px;
        }

        .endpoint-title-row {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        .endpoint-title-row h2 {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }

        .endpoint-url-bar {
            display: flex;
            align-items: center;
            background: rgba(11, 9, 20, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 12px 18px;
            font-family: var(--font-mono);
            font-size: 14px;
            margin-top: 8px;
            gap: 12px;
        }

        .endpoint-method {
            font-weight: 700;
            color: var(--accent-secondary);
        }

        .endpoint-path {
            color: var(--text-primary);
            flex: 1;
        }

        .copy-url-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 14px;
            transition: color 0.2s;
            padding: 4px;
        }

        .copy-url-btn:hover {
            color: #fff;
        }

        .endpoint-description {
            color: var(--text-secondary);
            font-size: 15px;
            line-height: 1.6;
        }

        /* Tab panels */
        .tabs-header {
            display: flex;
            gap: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            margin-bottom: 24px;
        }

        .tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-family: var(--font-main);
            font-size: 15px;
            font-weight: 600;
            padding: 12px 16px;
            cursor: pointer;
            position: relative;
            transition: color 0.2s;
        }

        .tab-btn:hover {
            color: #fff;
        }

        .tab-btn.active {
            color: var(--accent-secondary);
        }

        .tab-btn.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: var(--accent-primary);
            box-shadow: 0 0 10px var(--accent-primary);
        }

        /* Tables */
        .params-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 14px;
        }

        .params-table th {
            color: var(--accent-secondary);
            font-weight: 600;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }

        .params-table td {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.02);
            vertical-align: top;
        }

        .param-name {
            font-family: var(--font-mono);
            font-weight: 600;
            color: #fff;
        }

        .param-req {
            font-size: 11px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
        }

        .param-req.required {
            background: rgba(239, 68, 68, 0.1);
            color: var(--error);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .param-req.optional {
            background: rgba(148, 163, 184, 0.1);
            color: var(--text-secondary);
            border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .param-type {
            font-family: var(--font-mono);
            color: var(--accent-secondary);
        }

        .param-validation {
            font-family: var(--font-mono);
            font-size: 12px;
            color: var(--warning);
            background: rgba(245, 158, 11, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
        }

        /* Test section splits */
        .test-split {
            display: flex;
            gap: 32px;
        }

        .test-form-side {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .form-group label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            display: flex;
            justify-content: space-between;
        }

        .form-group input {
            background: rgba(11, 9, 20, 0.4);
            border: 1.5px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 12px 16px;
            color: #fff;
            font-family: var(--font-main);
            font-size: 14px;
            transition: all 0.25s;
        }

        .form-group input:focus {
            outline: none;
            border-color: var(--accent-primary);
            background: rgba(124, 58, 237, 0.05);
            box-shadow: 0 0 12px rgba(124, 58, 237, 0.15);
        }

        .test-btn {
            background: var(--accent-primary);
            color: #fff;
            border: none;
            border-radius: 12px;
            padding: 14px 24px;
            font-family: var(--font-main);
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.35);
        }

        .test-btn:hover {
            transform: translateY(-2px);
            background: #8B5CF6;
            box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
        }

        .test-btn:active {
            transform: translateY(0);
        }

        .test-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Response side */
        .response-side {
            flex: 1.2;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .response-info-row {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .status-badge {
            font-size: 13px;
            font-weight: 700;
            padding: 6px 12px;
            border-radius: 8px;
            font-family: var(--font-mono);
        }

        .status-badge.success {
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-badge.error {
            background: rgba(239, 68, 68, 0.15);
            color: var(--error);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .status-badge.empty {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-secondary);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .time-badge {
            font-size: 13px;
            color: var(--text-secondary);
            font-family: var(--font-mono);
            background: rgba(255, 255, 255, 0.03);
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .code-container {
            background: #06040d;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 20px;
            overflow: auto;
            flex: 1;
            min-height: 250px;
            max-height: 450px;
            position: relative;
        }

        .code-container pre {
            font-family: var(--font-mono);
            font-size: 13px;
            line-height: 1.6;
            color: #C9D1D9;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .action-row {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 8px;
        }

        .action-btn {
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
            padding: 8px 14px;
            border-radius: 8px;
            font-family: var(--font-main);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .action-btn:hover {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.25);
            background: rgba(255, 255, 255, 0.02);
        }

        /* Responsive styling */
        @media (max-width: 1024px) {
            .layout-container {
                flex-direction: column;
                padding: 20px;
            }
            .sidebar {
                width: 100%;
            }
            .test-split {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <header>
        <div class="logo-section">
            <div class="logo-badge">N</div>
            <div class="title-group">
                <h1>NotifyMe API Documentation</h1>
                <p>Interactive API playground & developer panel</p>
            </div>
        </div>
        <div class="env-badge">Local Environment</div>
    </header>

    <div class="layout-container">
        <!-- Sidebar Navigation -->
        <aside class="sidebar">
            <div class="section-card">
                <h2>Client API</h2>
                <ul class="route-list">
                    <li class="route-item active" id="route-register">
                        <button onclick="selectRoute('register')">
                            <span>Register Client</span>
                            <span class="method-badge post">POST</span>
                        </button>
                    </li>
                    <li class="route-item" id="route-login">
                        <button onclick="selectRoute('login')">
                            <span>Login Client</span>
                            <span class="method-badge post">POST</span>
                        </button>
                    </li>
                    <li class="route-item" id="route-update_fcm_token">
                        <button onclick="selectRoute('update_fcm_token')">
                            <span>Update FCM Token</span>
                            <span class="method-badge post">POST</span>
                        </button>
                    </li>
                    <li class="route-item" id="route-update_profile">
                        <button onclick="selectRoute('update_profile')">
                            <span>Update Profile</span>
                            <span class="method-badge post">POST</span>
                        </button>
                    </li>
                    <li class="route-item" id="route-get_notifications">
                        <button onclick="selectRoute('get_notifications')">
                            <span>Get Notifications</span>
                            <span class="method-badge get">GET</span>
                        </button>
                    </li>
                </ul>
            </div>
        </aside>

        <!-- Main Details Area -->
        <main class="main-content">
            <!-- Documentation Card -->
            <div class="section-card">
                <div class="endpoint-header">
                    <div class="endpoint-title-row">
                        <h2 id="route-title">Register Client</h2>
                    </div>
                    <div class="endpoint-url-bar">
                        <span class="endpoint-method" id="route-url-method">POST</span>
                        <span class="endpoint-path" id="route-url-path">/api/register</span>
                        <button class="copy-url-btn" onclick="copyRouteUrl()" title="Copy Full URL">📋</button>
                    </div>
                </div>
                <p class="endpoint-description" id="route-description">
                    Register a new client user in the system. Upon successful registration, returns the client details and an API access token.
                </p>
            </div>

            <!-- Parameters & Try-it-out Card -->
            <div class="section-card">
                <div class="tabs-header">
                    <button class="tab-btn active" onclick="switchTab('test')" id="tab-test-btn">Try it out</button>
                    <button class="tab-btn" onclick="switchTab('docs')" id="tab-docs-btn">Parameters</button>
                </div>

                <!-- Parameters Table View -->
                <div id="tab-docs" style="display: none;">
                    <table class="params-table">
                        <thead>
                            <tr>
                                <th>Parameter</th>
                                <th>Type</th>
                                <th>Required</th>
                                <th>Validation</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody id="params-table-body">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>

                <!-- Testing Console View -->
                <div id="tab-test">
                    <div class="test-split">
                        <!-- Left Panel: Input Fields -->
                        <div class="test-form-side">
                            <form id="test-api-form" onsubmit="handleFormSubmit(event)">
                                <div id="form-fields-container">
                                    <!-- Populated dynamically -->
                                </div>
                                <button type="submit" class="test-btn" id="submit-btn" style="margin-top: 12px;">
                                    <span>Send Request</span>
                                </button>
                            </form>
                        </div>

                        <!-- Right Panel: Live Response -->
                        <div class="response-side">
                            <div class="response-info-row">
                                <span class="status-badge empty" id="res-status">No response yet</span>
                                <span class="time-badge" id="res-time" style="display: none;">0 ms</span>
                            </div>
                            <div class="code-container">
                                <pre id="res-body">// Response body will appear here</pre>
                            </div>
                            <div class="action-row">
                                <button class="action-btn" onclick="copyResponse()">Copy JSON</button>
                                <button class="action-btn" onclick="clearResponse()">Clear</button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <script>
        // API Route specifications
        const apiRoutes = {
            register: {
                name: 'Register Client',
                url: '/api/register',
                method: 'POST',
                description: 'Register a new client user in the system. Upon successful registration, returns the client details and an API access token.',
                parameters: [
                    { name: 'full_name', type: 'string', required: true, validation: 'min:3|max:255', desc: 'The full name of the client.' },
                    { name: 'phone_number', type: 'string', required: true, validation: 'unique:clients', desc: 'The phone number of the client (used as login ID).' },
                    { name: 'password', type: 'string', required: true, validation: 'min:6', desc: 'The password for client authentication.' }
                ],
                defaultPayload: {
                    full_name: 'John Doe',
                    phone_number: '+1234567890',
                    password: 'secretpassword'
                }
            },
            login: {
                name: 'Login Client',
                url: '/api/login',
                method: 'POST',
                description: 'Authenticate an existing client user. Upon successful authentication, generates and returns a new API access token.',
                parameters: [
                    { name: 'phone_number', type: 'string', required: true, validation: 'required', desc: 'The registered phone number.' },
                    { name: 'password', type: 'string', required: true, validation: 'required', desc: 'The account password.' }
                ],
                defaultPayload: {
                    phone_number: '+1234567890',
                    password: 'secretpassword'
                }
            },
            update_fcm_token: {
                name: 'Update FCM Token',
                url: '/api/update-fcm-token',
                method: 'POST',
                description: 'Update the Firebase Cloud Messaging (FCM) registration token for an authenticated client user using their API access token.',
                parameters: [
                    { name: 'api_token', type: 'string', required: true, validation: 'required', desc: 'The client\'s current API token.' },
                    { name: 'fcm_token', type: 'string', required: true, validation: 'required', desc: 'The FCM device token from Firebase.' }
                ],
                defaultPayload: {
                    api_token: '',
                    fcm_token: 'sample_fcm_token_123456789'
                }
            },
            update_profile: {
                name: 'Update Profile',
                url: '/api/update-profile',
                method: 'POST',
                description: 'Update the name and/or password for an authenticated client user using their API access token.',
                parameters: [
                    { name: 'api_token', type: 'string', required: true, validation: 'required', desc: 'The client\'s current API token.' },
                    { name: 'full_name', type: 'string', required: false, validation: 'min:3|max:255', desc: 'The new full name of the client (optional).' },
                    { name: 'password', type: 'string', required: false, validation: 'min:6', desc: 'The new password of the client (optional).' }
                ],
                defaultPayload: {
                    api_token: '',
                    full_name: 'Jane Doe',
                    password: 'newsecretpassword'
                }
            },
            get_notifications: {
                name: 'Get Notifications',
                url: '/api/notifications',
                method: 'POST',
                description: 'Retrieve the notification history for an authenticated client user using their API access token.',
                parameters: [
                    { name: 'api_token', type: 'string', required: true, validation: 'required', desc: 'The client\'s current API token.' }
                ],
                defaultPayload: {
                    api_token: ''
                }
            }
        };

        let currentRouteKey = 'register';
        let currentTab = 'test';

        // Select API route
        function selectRoute(key) {
            currentRouteKey = key;
            const route = apiRoutes[key];

            // Update active sidebar state
            document.querySelectorAll('.route-list li').forEach(li => li.classList.remove('active'));
            document.getElementById(`route-${key}`).classList.add('active');

            // Update documentation text
            document.getElementById('route-title').innerText = route.name;
            document.getElementById('route-url-method').innerText = route.method;
            document.getElementById('route-url-path').innerText = route.url;
            document.getElementById('route-description').innerText = route.description;

            // Generate Parameters Table
            const tbody = document.getElementById('params-table-body');
            tbody.innerHTML = '';
            route.parameters.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="param-name">
                        ${p.name}
                        <span class="param-req ${p.required ? 'required' : 'optional'}">
                            ${p.required ? 'required' : 'optional'}
                        </span>
                    </td>
                    <td class="param-type">${p.type}</td>
                    <td>${p.required ? 'Yes' : 'No'}</td>
                    <td><span class="param-validation">${p.validation}</span></td>
                    <td style="color: var(--text-secondary);">${p.desc}</td>
                `;
                tbody.appendChild(tr);
            });

            // Generate Form inputs
            const formFields = document.getElementById('form-fields-container');
            formFields.innerHTML = '';
            route.parameters.forEach(p => {
                const group = document.createElement('div');
                group.className = 'form-group';
                const inputType = p.name === 'password' ? 'password' : 'text';
                group.innerHTML = `
                    <label for="input-${p.name}">
                        <span>${p.name.replace('_', ' ').toUpperCase()}</span>
                        ${p.required ? '<span style="color: var(--error);">*</span>' : ''}
                    </label>
                    <input type="${inputType}" id="input-${p.name}" name="${p.name}" value="${route.defaultPayload[p.name] || ''}" required>
                `;
                formFields.appendChild(group);
            });

            clearResponse();
        }

        // Switch panel tabs
        function switchTab(tab) {
            currentTab = tab;
            if (tab === 'test') {
                document.getElementById('tab-test').style.display = 'block';
                document.getElementById('tab-docs').style.display = 'none';
                document.getElementById('tab-test-btn').classList.add('active');
                document.getElementById('tab-docs-btn').classList.remove('active');
            } else {
                document.getElementById('tab-test').style.display = 'none';
                document.getElementById('tab-docs').style.display = 'block';
                document.getElementById('tab-test-btn').classList.remove('active');
                document.getElementById('tab-docs-btn').classList.add('active');
            }
        }

        // Copy current route URL
        function copyRouteUrl() {
            const path = apiRoutes[currentRouteKey].url;
            const fullUrl = window.location.origin + path;
            navigator.clipboard.writeText(fullUrl).then(() => {
                alert('Copied full URL to clipboard: ' + fullUrl);
            });
        }

        // Copy response body
        function copyResponse() {
            const bodyText = document.getElementById('res-body').innerText;
            navigator.clipboard.writeText(bodyText).then(() => {
                alert('Copied response to clipboard!');
            });
        }

        // Clear response details
        function clearResponse() {
            const status = document.getElementById('res-status');
            status.className = 'status-badge empty';
            status.innerText = 'No response yet';

            document.getElementById('res-time').style.display = 'none';
            document.getElementById('res-body').innerText = '// Response body will appear here';
        }

        // Submit form request to API
        async function handleFormSubmit(e) {
            e.preventDefault();
            const route = apiRoutes[currentRouteKey];
            const btn = document.getElementById('submit-btn');
            
            // Gather form payload
            const payload = {};
            route.parameters.forEach(p => {
                payload[p.name] = document.getElementById(`input-${p.name}`).value;
            });

            // Set loading state
            btn.disabled = true;
            btn.innerHTML = `<div class="spinner"></div><span>Sending...</span>`;

            const startTime = performance.now();
            try {
                const response = await fetch(route.url, {
                    method: route.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });
                
                const duration = Math.round(performance.now() - startTime);
                const status = response.status;
                const statusText = response.statusText;
                
                let data;
                try {
                    data = await response.json();
                } catch {
                    data = { message: 'Could not parse JSON response.' };
                }

                // Render success/error state
                const statusBadge = document.getElementById('res-status');
                statusBadge.innerText = `${status} ${statusText}`;
                
                if (response.ok) {
                    statusBadge.className = 'status-badge success';
                } else {
                    statusBadge.className = 'status-badge error';
                }

                const timeBadge = document.getElementById('res-time');
                timeBadge.innerText = `${duration} ms`;
                timeBadge.style.display = 'inline-block';

                document.getElementById('res-body').innerText = JSON.stringify(data, null, 4);

            } catch (err) {
                const duration = Math.round(performance.now() - startTime);
                const statusBadge = document.getElementById('res-status');
                statusBadge.innerText = 'Network Error';
                statusBadge.className = 'status-badge error';

                const timeBadge = document.getElementById('res-time');
                timeBadge.innerText = `${duration} ms`;
                timeBadge.style.display = 'inline-block';

                document.getElementById('res-body').innerText = JSON.stringify({
                    error: err.message || 'Connection failed. Please ensure the backend server is running.'
                }, null, 4);
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<span>Send Request</span>`;
            }
        }

        // Initialize default route
        selectRoute('register');
    </script>
</body>
</html>
