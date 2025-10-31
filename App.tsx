
import React, { useState, useMemo, useEffect } from 'react';
import { UserRole, Case, DocumentFile, User, Notification, AuditLog, KeyDate, Settings, InternalNote } from './types';
import { mockCases, mockUsers } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CaseDetailView from './views/CaseDetailView';
import Dashboard from './views/Dashboard';
import LoginView from './views/LoginView';
import AdminView from './views/AdminView';
import SettingsView from './views/SettingsView';
import SignUpView from './views/SignUpView';

type AppView = 'dashboard' | 'admin' | 'settings';
type AuthView = 'login' | 'signup';

const defaultSettings: Settings = {
    theme: 'light',
    firmName: 'Ace Legal Partners',
    firmAddress: '123 Justice Way, Freetown, Sierra Leone',
    retentionPeriod: '7',
    versioning: true,
    ipWhitelist: '192.168.1.1\n10.0.0.5',
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [cases, setCases] = useState<Case[]>(mockCases);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [view, setView] = useState<AppView>('dashboard');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [loginError, setLoginError] = useState('');
  
  const [users, setUsers] = useState<User[]>(Object.values(mockUsers));
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [systemLogs, setSystemLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#111827';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#F8F9FA';
    }
  }, [settings.theme]);

  const handleUpdateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
     logSystemActivity('Updated Settings', `Changed application settings: ${Object.keys(newSettings).join(', ')}.`, 'System');
  };

  const casesForUser: Case[] = useMemo(() => {
    if (!currentUser) return [];
    if ([UserRole.Lawyer, UserRole.Admin, UserRole.Secretary].includes(currentUser.role)) {
      return cases;
    }
    return cases.filter(c => c.client.id === currentUser.id);
  }, [currentUser, cases]);
  
  const logSystemActivity = (action: string, details: string, category: AuditLog['category'] = 'System') => {
    const user = currentUser ? currentUser.name : "System";
    const newLog: AuditLog = {
      id: `syslog-${Date.now()}`,
      user,
      action,
      details,
      timestamp: new Date().toLocaleString(),
      category,
    };
    setSystemLogs(prev => [newLog, ...prev]);
  };

  const addNotification = (message: string, caseId: string) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      caseId,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
  };

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const logAuditActivity = (caseId: string, action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      user: currentUser.name,
      action,
      details,
      timestamp: new Date().toLocaleString(),
      category: 'User Action',
    };
    const updatedCases = cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          auditLogs: [newLog, ...c.auditLogs],
        };
      }
      return c;
    });
    setCases(updatedCases);
    if (selectedCase?.id === caseId) {
      const updatedSelectedCase = updatedCases.find(c => c.id === caseId);
      if (updatedSelectedCase) {
        setSelectedCase(updatedSelectedCase);
      }
    }
  };

  const handleSelectCase = (caseData: Case) => {
    setSelectedCase(caseData);
  };

  const handleBackToDashboard = () => {
    setSelectedCase(null);
    setView('dashboard');
  };

  const performLogin = (user: User) => {
      setCurrentUser(user);
      setSelectedCase(null);
      if (user.role === UserRole.Admin) {
        setView('admin');
      } else {
        setView('dashboard');
      }
      setLoginError('');
  }

  const handleLogin = (email: string, password?: string) => {
    setLoginError('');
    const foundUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());

    if (!foundUser || foundUser.password !== password) {
        setLoginError('Invalid email or password. Please try again.');
        return;
    }

    if (foundUser.status !== 'Active') {
        setLoginError('Your account is pending approval or has been deactivated. Please contact an administrator.');
        return;
    }

    performLogin(foundUser);
  }
  
  const handleSignUp = (newUser: Omit<User, 'id' | 'avatarUrl' | 'status'>): boolean => {
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
        return false;
    }

    const user: User = {
        ...newUser,
        id: `u${Date.now()}`,
        avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
        status: 'Invited', 
    };

    setUsers(prev => [...prev, user]);
    logSystemActivity('User Signed Up', `New user ${user.email} registered with role ${user.role}. Account requires approval.`, 'User Action');
    return true;
  };

  const handleSsoLogin = (provider: 'Google' | 'Microsoft') => {
    const ssoUser = users.find(u => u.email === 'admin@acelegalpartnerssl.com');
    if (ssoUser && ssoUser.status === 'Active') {
        performLogin(ssoUser);
        logSystemActivity('SSO Login', `User ${ssoUser.email} logged in via ${provider}.`, 'Security');
    } else {
        setLoginError('SSO login failed. Please contact an administrator.');
    }
  }

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedCase(null);
    setAuthView('login');
  }

  const handleDocumentUpload = (caseId: string, documentData: { name: string; type: DocumentFile['type'], tags: string[], status: DocumentFile['status'] }) => {
    if (!currentUser) return;

    const updatedCases = cases.map(c => {
      if (c.id === caseId) {
        const existingDocs = c.documents.filter(d => d.name === documentData.name);
        const newVersion = existingDocs.length > 0 ? Math.max(...existingDocs.map(d => d.version)) + 1 : 1;

        const newDocument: DocumentFile = {
            id: `d${Date.now()}`,
            name: documentData.name,
            type: documentData.type,
            size: `${(Math.random() * 5).toFixed(1)} MB`,
            uploadedBy: currentUser.name,
            uploadDate: new Date().toISOString().split('T')[0],
            version: newVersion,
            content: `This is the content for v${newVersion} of the uploaded document: ${documentData.name}.`,
            status: documentData.status,
            tags: documentData.tags,
        };
        
        logAuditActivity(caseId, 'Uploaded', `${newDocument.name} (v${newVersion})`);
        addNotification(
            `${currentUser.name} uploaded "${newDocument.name}"`,
            caseId
        );
        
        return {
          ...c,
          documents: [newDocument, ...c.documents],
        };
      }
      return c;
    });

    setCases(updatedCases);
    if (selectedCase?.id === caseId) {
      const updatedSelectedCase = updatedCases.find(c => c.id === caseId);
      if (updatedSelectedCase) {
        setSelectedCase(updatedSelectedCase);
      }
    }
  };

  const handleUpdateDocumentStatus = (caseId: string, documentId: string, status: DocumentFile['status']) => {
    let docName = '';
    const updatedCases = cases.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          documents: c.documents.map(d => {
            if (d.id === documentId) {
              docName = d.name;
              return { ...d, status };
            }
            return d;
          }),
        };
      }
      return c;
    });

    setCases(updatedCases);
    if (docName) {
      logAuditActivity(caseId, 'Updated Status', `Set status of ${docName} to ${status}`);
    }
    if (selectedCase?.id === caseId) {
      const updatedSelectedCase = updatedCases.find(c => c.id === caseId);
      if (updatedSelectedCase) {
        setSelectedCase(updatedSelectedCase);
      }
    }
  };
  
  const handleAddKeyDate = (caseId: string, keyDate: Omit<KeyDate, 'id'>) => {
     const updatedCases = cases.map(c => {
      if (c.id === caseId) {
        const newKeyDate: KeyDate = { ...keyDate, id: `kd-${Date.now()}` };
        logAuditActivity(caseId, 'Added Key Date', `${keyDate.description} on ${keyDate.date}`);
        return {
          ...c,
          keyDates: [...c.keyDates, newKeyDate].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        };
      }
      return c;
    });
     setCases(updatedCases);
     if (selectedCase?.id === caseId) {
      const updatedSelectedCase = updatedCases.find(c => c.id === caseId);
      if (updatedSelectedCase) {
        setSelectedCase(updatedSelectedCase);
      }
    }
  };
  
  const handleAddNote = (caseId: string, content: string) => {
    if (!currentUser) return;

    const updatedCases = cases.map(c => {
      if (c.id === caseId) {
        const newNote: InternalNote = {
          id: `in-${Date.now()}`,
          author: currentUser.name,
          content,
          timestamp: new Date().toLocaleString(),
        };
        logAuditActivity(caseId, 'Added Internal Note', `Added a new confidential note.`);
        return {
          ...c,
          internalNotes: [newNote, ...c.internalNotes],
        };
      }
      return c;
    });

    setCases(updatedCases);
    if (selectedCase?.id === caseId) {
      const updatedSelectedCase = updatedCases.find(c => c.id === caseId);
      if (updatedSelectedCase) {
        setSelectedCase(updatedSelectedCase);
      }
    }
  };

  const handleCreateCase = (caseData: { title: string; clientName: string; assignedLawyerId: string; }) => {
    const assignedLawyer = users.find(u => u.id === caseData.assignedLawyerId);
     if (!assignedLawyer) {
        console.error("Could not find assigned lawyer");
        return;
    }

    // A new client user also needs to be created
    const newClientUser: User = {
        id: `c${Date.now()}`,
        name: caseData.clientName,
        email: `${caseData.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        role: UserRole.Client,
        avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
        status: 'Active',
    }
    setUsers(prev => [...prev, newClientUser]);

    const newCase: Case = {
        id: `case${Date.now()}`,
        caseNumber: `ALP-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, '0')}`,
        title: caseData.title,
        client: newClientUser,
        assignedLawyer: assignedLawyer,
        status: 'Pending',
        documents: [],
        auditLogs: [],
        legalHold: false,
        caseType: 'General',
        keyDates: [],
        internalNotes: [],
    };

    setCases(prevCases => [newCase, ...prevCases]);
    logSystemActivity('Case Created', `New case "${newCase.title}" was created.`, 'User Action');
  };

  const handleUpdateUser = (userId: string, updates: Partial<Pick<User, 'role' | 'status'>>) => {
    setUsers(prevUsers => prevUsers.map(user => user.id === userId ? { ...user, ...updates } : user));
    const updatedUser = users.find(u => u.id === userId);
    if (updatedUser) {
      const details = Object.entries(updates).map(([key, value]) => `${key} to ${value}`).join(', ');
      logSystemActivity('Updated User', `Changed ${details} for ${updatedUser.email}.`, 'User Action');
    }
  };

  const handleInviteUser = (email: string, role: UserRole) => {
    const newUser: User = {
      id: `u${Date.now()}`,
      name: 'Invited User',
      email,
      role,
      avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
      status: 'Invited',
    };
    setUsers(prevUsers => [...prevUsers, newUser]);
    logSystemActivity('Invited User', `Sent invitation to ${email} with role ${role}.`, 'User Action');
  };
  
  const handleToggleLegalHold = (caseId: string) => {
    let caseTitle = '';
    const updatedCases = cases.map(c => {
        if (c.id === caseId) {
            caseTitle = c.title;
            return { ...c, legalHold: !c.legalHold };
        }
        return c;
    });
    setCases(updatedCases);
    const updatedCase = updatedCases.find(c => c.id === caseId);
    if (updatedCase) {
      logSystemActivity(
        'Legal Hold',
        `Legal hold was ${updatedCase.legalHold ? 'enabled' : 'disabled'} for case: ${caseTitle}.`,
        'System'
      );
      if (selectedCase?.id === caseId) {
        setSelectedCase(updatedCase);
      }
    }
  };

  const renderContent = () => {
    switch (view) {
        case 'admin':
            return <AdminView 
                    users={users}
                    systemLogs={systemLogs}
                    onInviteUser={handleInviteUser}
                    onUpdateUser={handleUpdateUser}
                    cases={cases}
                />;
        case 'settings':
            return <SettingsView 
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onNavigateToAdmin={() => setView('admin')}
                userRole={currentUser!.role}
            />;
        case 'dashboard':
        default:
            if (selectedCase) {
                 return <CaseDetailView
                    caseData={selectedCase}
                    user={currentUser!}
                    onBack={handleBackToDashboard}
                    onDocumentUpload={handleDocumentUpload}
                    addNotification={addNotification}
                    logAuditActivity={logAuditActivity}
                    onToggleLegalHold={handleToggleLegalHold}
                    onUpdateDocumentStatus={handleUpdateDocumentStatus}
                    onAddKeyDate={handleAddKeyDate}
                    onAddNote={handleAddNote}
                />
            }
            return <Dashboard
                cases={casesForUser}
                onSelectCase={handleSelectCase}
                userRole={currentUser!.role}
                onCreateCase={handleCreateCase}
                lawyers={users.filter(u => u.role === UserRole.Lawyer)}
            />
    }
  }

  if (!currentUser) {
    if (authView === 'signup') {
        return <SignUpView onSignUp={handleSignUp} onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onLogin={handleLogin} onSsoLogin={handleSsoLogin} error={loginError} onNavigateToSignUp={() => setAuthView('signup')} />;
  }

  return (
    <div className="flex h-screen bg-brand-light text-brand-gray dark:bg-dark-bg dark:text-dark-text-secondary">
      <Sidebar role={currentUser.role} onSetView={setView} currentView={view} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
            user={currentUser}
            onLogout={handleLogout}
            notifications={notifications}
            onMarkNotificationsRead={markNotificationsAsRead}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-light dark:bg-dark-bg p-4 sm:p-6 lg:p-8">
            {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;