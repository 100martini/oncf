import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken, getToken } from '../utils/auth';
import '../styles/FullDashboard.css';
import '../styles/Congrats.css';
import '../styles/Profilefriends.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const FullDashboard = ({ user: userProp }) => {
  const navigate = useNavigate();
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [activeSection, setActiveSection] = useState('oc');
  const [teamName, setTeamName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showInvites, setShowInvites] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState(null);

  const [activeView, setActiveView] = useState(() => {
    return sessionStorage.getItem('dashboardView') || 'dashboard';
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const userMenuRef = useRef(null);

  const [freshUser, setFreshUser] = useState(null);
  const user = freshUser || userProp;

  const [profileNickname, setProfileNickname] = useState('');
  const [profileAvatarPreview, setProfileAvatarPreview] = useState(null);
  const [profileAvatarData, setProfileAvatarData] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const fileInputRef = useRef(null);
  const justSavedRef = useRef(false);

  const [friends, setFriends] = useState([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friendSearch, setFriendSearch] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [addUserSearch, setAddUserSearch] = useState('');
  const [addUserResults, setAddUserResults] = useState([]);
  const [addUserSearching, setAddUserSearching] = useState(false);
  const [friendsTab, setFriendsTab] = useState('friends');

  const [showDeleteFriendConfirm, setShowDeleteFriendConfirm] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState(null);

  const username = user?.login || 'user';
  const currentUserId = user?.intraId || user?.id;
  const campus = user?.campus || 'Campus';
  const wallet = user?.wallet || 0;
  const correctionPoints = user?.correctionPoints || user?.correction_point || 0;
  const level = user?.level || user?.cursusUsers?.find(c => c.cursus?.slug === '42cursus')?.level || 0;
  const effectiveAvatar = user?.customAvatar || user?.avatar || user?.image?.link || user?.image?.versions?.medium;
  const avatarUrl = effectiveAvatar;
  const userProjects = user?.projectsUsers || [];
  const currentCircle = user?.currentCircle ?? 0;
  const curriculum = user?.curriculum || 'unknown';

  const grade = useMemo(() => {
    const cursus42 = user?.cursusUsers?.find(c => c.cursus?.slug === '42cursus' || c.cursus_id === 21);
    return cursus42?.grade || user?.grade || 'Cadet';
  }, [user]);

  const isCadet = grade === 'Cadet';
  const isTranscender = grade === 'Transcender' || grade === 'Member';

  useEffect(() => {
    sessionStorage.setItem('dashboardView', activeView);
  }, [activeView]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFreshUser = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFreshUser(data);
      }
    } catch (err) {
      console.error('Failed to refresh user data');
    }
  }, []);

  const silentSync = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/auth/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchFreshUser();
      }
    } catch (err) {
    }
  }, [fetchFreshUser]);

  useEffect(() => {
    const init = async () => {
      await fetchFreshUser();
      fetchProjects();
      fetchMyTeams();
      fetchPendingInvites();
      fetchDeleteRequests();
      fetchFriends();
      fetchPendingFriendRequests();
      silentSync();
    };
    init();

    const interval = setInterval(() => {
      fetchMyTeams();
      fetchPendingInvites();
      fetchDeleteRequests();
      fetchFriends();
      fetchPendingFriendRequests();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeView === 'friends') {
      fetchFriends();
      fetchPendingFriendRequests();
    }
  }, [activeView]);

  useEffect(() => {
    if (showProfile && user) {
      if (justSavedRef.current) {
        justSavedRef.current = false;
        return;
      }
      setProfileNickname(user.nickname || '');
      setProfileAvatarPreview(null);
      setProfileAvatarData(null);
      setProfileError(null);
      setProfileSuccess(null);
    }
  }, [showProfile, user]);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/projects`);
      if (response.ok) {
        const data = await response.json();
        setAllProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchMyTeams = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/teams/my-teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMyTeams(data);
      }
    } catch (err) {
      console.error('Failed to fetch teams');
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/teams/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingInvites(data);
      }
    } catch (err) {
      console.error('Failed to fetch invites');
    }
  };

  const fetchDeleteRequests = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/teams/delete-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDeleteRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch delete requests');
    }
  };

  const fetchFriends = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setFriends(await response.json());
    } catch (err) {
      console.error('Failed to fetch friends');
    }
  };

  const fetchPendingFriendRequests = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/friends/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setPendingFriendRequests(await response.json());
    } catch (err) {
      console.error('Failed to fetch friend requests');
    }
  };

  const handleAddFriendSearch = useCallback(async (query) => {
    if (query.length < 2) { setAddUserResults([]); setAddUserSearching(false); return; }
    setAddUserSearching(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/friends/search-users?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setAddUserResults(await response.json());
    } catch (err) {
      setAddUserResults([]);
    }
    setAddUserSearching(false);
  }, []);

  const handleFriendSearch = useCallback(async (query) => {
    if (query.length < 1) { setFriendSearchResults([]); setFriendSearching(false); return; }
    setFriendSearching(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/friends/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setFriendSearchResults(await response.json());
    } catch (err) {
      setFriendSearchResults([]);
    }
    setFriendSearching(false);
  }, []);

  const sendFriendRequest = async (userId) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.autoAccepted) fetchFriends();
        await fetchPendingFriendRequests();
        if (addUserSearch.length >= 2) handleAddFriendSearch(addUserSearch);
      }
    } catch (err) {
      console.error('Failed to send friend request');
    }
  };

  const respondToFriendRequest = async (friendshipId, accept) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/friends/${friendshipId}/respond`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });
      if (response.ok) {
        fetchFriends();
        fetchPendingFriendRequests();
        setAddUserResults([]);
        setAddUserSearch('');
      }
    } catch (err) {
      console.error('Failed to respond to friend request');
    }
  };

  const handleRemoveFriendClick = (friend) => {
    setFriendToDelete(friend);
    setShowDeleteFriendConfirm(true);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToDelete) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/friends/${friendToDelete.friendshipId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchFriends();
        fetchPendingFriendRequests();
        setAddUserResults([]);
        setAddUserSearch('');
      }
    } catch (err) {
      console.error('Failed to remove friend');
    }
    setShowDeleteFriendConfirm(false);
    setFriendToDelete(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Image must be smaller than 2MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setProfileError('Use JPEG, PNG, GIF, or WebP format');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfileAvatarPreview(ev.target.result);
      setProfileAvatarData(ev.target.result);
      setProfileError(null);
      setProfileSuccess(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const token = getToken();
      const body = {};

      const currentNickname = user?.nickname || '';
      const newNickname = profileNickname.trim();

      if (newNickname !== currentNickname) {
        body.nickname = newNickname;
      }
      if (profileAvatarData) {
        body.customAvatar = profileAvatarData;
      }

      if (Object.keys(body).length === 0) {
        setProfileError('No changes to save');
        setProfileSaving(false);
        return;
      }

      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save');

      justSavedRef.current = true;
      setFreshUser(prev => ({ ...prev, ...data }));

      if (body.nickname !== undefined && body.customAvatar) {
        setProfileSuccess('Nickname and avatar updated successfully!');
      } else if (body.nickname !== undefined) {
        setProfileSuccess(body.nickname === '' ? 'Nickname removed!' : 'Nickname changed successfully!');
      } else if (body.customAvatar) {
        setProfileSuccess('Avatar updated successfully!');
      }

      setProfileAvatarData(null);
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err) {
      setProfileError(err.message);
    }
    setProfileSaving(false);
  };

  const handleResetAvatar = async () => {
    setProfileSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customAvatar: null })
      });
      const data = await response.json();
      if (response.ok) {
        justSavedRef.current = true;
        setFreshUser(prev => ({ ...prev, ...data }));
        setProfileAvatarPreview(null);
        setProfileAvatarData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setProfileSuccess('Avatar reset to intra photo!');
        setTimeout(() => setProfileSuccess(null), 4000);
      }
    } catch (err) {
      setProfileError('Failed to reset avatar');
    }
    setProfileSaving(false);
  };

  const handleLogout = useCallback(() => {
    removeToken();
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('welcomeShown');
    sessionStorage.removeItem('dashboardView');
    navigate('/login');
  }, [navigate]);

  const searchUsers = useCallback(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({
        q: query,
        curriculum: curriculum,
        grade: grade
      });
      if (selectedProject?.slug) {
        params.append('projectSlug', selectedProject.slug);
      }
      const response = await fetch(`${API_URL}/auth/users/search?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setSearchResults([]);
    }
    setSearching(false);
  }, [curriculum, grade, selectedProject]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const addMember = (member) => {
    const maxMembersCount = (selectedProject?.maxTeam || selectedProject?.minTeam || 2) - 1;
    if (selectedMembers.length >= maxMembersCount) return;
    if (!selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers([...selectedMembers, member]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMember = (memberId) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== memberId));
  };

  const resetTeamModal = () => {
    setTeamName('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
  };

  const minMembers = (selectedProject?.minTeam || 2) - 1;
  const maxMembers = (selectedProject?.maxTeam || selectedProject?.minTeam || 2) - 1;
  const canCreateTeam = teamName.trim() !== '' && selectedMembers.length >= minMembers;

  const getCurriculumProjects = useMemo(() => {
    if (allProjects.length === 0) return {};

    const projectsByCircle = {};
    const userCurriculum = curriculum === 'unknown' ? 'old' : curriculum;

    allProjects.forEach(project => {
      if (project.isOuterCore) return;
      const projCircle = project.curriculaCircles?.[userCurriculum];
      if (projCircle === undefined) return;
      if (!projectsByCircle[projCircle]) {
        projectsByCircle[projCircle] = [];
      }
      projectsByCircle[projCircle].push({
        slug: project.slug,
        name: project.name,
        team: project.minTeam,
        minTeam: project.minTeam,
        maxTeam: project.maxTeam
      });
    });

    return projectsByCircle;
  }, [allProjects, curriculum]);

  const getUserProjectStatus = useCallback((projectSlug) => {
    const normalizedSlug = projectSlug.toLowerCase().replace(/_/g, '-');
    const project = userProjects.find(p => {
      const pSlug = (p.project?.slug || '').toLowerCase().replace(/_/g, '-');
      return pSlug === normalizedSlug;
    });
    if (!project) return null;
    return {
      status: project.status,
      validated: project['validated?'],
      finalMark: project.final_mark,
      id: project.id
    };
  }, [userProjects]);

  const getCircleProjects = useCallback((circleNum) => {
    const circleDefinition = getCurriculumProjects[circleNum] || [];
    return circleDefinition.map(proj => ({
      ...proj,
      userStatus: getUserProjectStatus(proj.slug)
    }));
  }, [getCurriculumProjects, getUserProjectStatus]);

  const needsCurriculumDetection = curriculum === 'unknown' && currentCircle >= 1;
  const activeCircle = selectedCircle !== null ? selectedCircle : currentCircle;

  const circleProjects = useMemo(() => {
    if (needsCurriculumDetection && activeCircle === 1) {
      return getCircleProjects(1);
    }
    return getCircleProjects(activeCircle);
  }, [activeCircle, getCircleProjects, needsCurriculumDetection]);

  const getCircleStats = useCallback((circleNum) => {
    const projects = getCircleProjects(circleNum);
    const completed = projects.filter(p => p.userStatus?.status === 'finished' && p.userStatus?.validated).length;
    return { total: projects.length, completed };
  }, [getCircleProjects]);

  const allCCProjects = useMemo(() => {
    if (!isTranscender) return [];
    const projects = [];
    const userCurriculum = curriculum === 'unknown' ? 'old' : curriculum;

    allProjects.forEach(project => {
      const projCircle = project.curriculaCircles?.[userCurriculum];
      if (projCircle === undefined || project.isOuterCore) return;
      const userStatus = getUserProjectStatus(project.slug);
      if (userStatus) {
        projects.push({
          slug: project.slug,
          name: project.name,
          team: project.minTeam,
          minTeam: project.minTeam,
          maxTeam: project.maxTeam,
          circle: projCircle,
          userStatus
        });
      }
    });

    return projects;
  }, [isTranscender, allProjects, curriculum, getUserProjectStatus]);

  const isExcludedOC = (slug) => {
    const s = slug.toLowerCase();
    return (
      s.includes('exam-rank') ||
      s.includes('work-experience') ||
      s.startsWith('42cursus-')
    );
  };

  const outerCoreProjects = useMemo(() => {
    if (!isTranscender) return [];

    const dbOuterCoreProjects = allProjects
      .filter(p => p.isOuterCore && !isExcludedOC(p.slug))
      .map(p => ({
        slug: p.slug,
        name: p.name,
        team: p.minTeam,
        minTeam: p.minTeam,
        maxTeam: p.maxTeam,
        userStatus: getUserProjectStatus(p.slug)
      }))
      .filter(p => p.userStatus);

    const userOCProjects = userProjects
      .filter(p => p.project?.isOuterCore && !isExcludedOC(p.project.slug))
      .map(p => ({
        slug: p.project.slug,
        name: p.project.name,
        team: 1,
        minTeam: 1,
        maxTeam: 1,
        userStatus: {
          status: p.status,
          validated: p['validated?'],
          finalMark: p.final_mark,
          id: p.id
        }
      }));

    const allOC = [...dbOuterCoreProjects];
    userOCProjects.forEach(uProject => {
      if (!allOC.find(p => p.slug?.toLowerCase() === uProject.slug?.toLowerCase())) {
        allOC.push(uProject);
      }
    });

    return allOC;
  }, [isTranscender, allProjects, userProjects, getUserProjectStatus]);

  const hasIncomingPendingInvite = useCallback((projectSlug) => {
    return pendingInvites.some(i => i.project?.slug === projectSlug && i.myStatus === 'pending');
  }, [pendingInvites]);

  const handleProjectClick = (project) => {
    if (hasIncomingPendingInvite(project.slug)) return;

    if (project.team > 1 || project.minTeam > 1) {
      const existingTeam = myTeams.find(t => t.project.slug === project.slug && t.status === 'approved');
      if (existingTeam) {
        navigate(`/kanban/${project.slug}`);
        return;
      }
      const pendingTeam = myTeams.find(t => t.project.slug === project.slug && t.status === 'pending');
      if (pendingTeam) return;
      setSelectedProject(project);
      setShowCreateTeam(true);
    } else {
      navigate(`/kanban/${project.slug}`);
    }
  };

  const handleTeamCreated = async () => {
    if (!canCreateTeam) return;
    setIsCreatingTeam(true);
    setTeamError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          projectSlug: selectedProject.slug,
          memberIds: selectedMembers.map(m => m.id)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create team');
      await fetchMyTeams();
      await fetchPendingInvites();
      setShowCreateTeam(false);
      resetTeamModal();
    } catch (err) {
      console.error('Failed to create team:', err);
      setTeamError(err.message || 'Failed to create team');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleInviteResponse = async (team, accept) => {
    try {
      const token = getToken();
      const teamId = team._id || team.id;
      const response = await fetch(`${API_URL}/teams/${teamId}/respond`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });
      if (response.ok) {
        await fetchPendingInvites();
        await fetchMyTeams();
      }
    } catch (err) {
      console.error('Failed to respond to invite');
    }
  };

  const handleDeleteTeam = (team, e) => {
    e.stopPropagation();
    setTeamToDelete(team);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      const token = getToken();
      const teamId = teamToDelete._id || teamToDelete.id;
      const response = await fetch(`${API_URL}/teams/${teamId}/request-delete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        await fetchMyTeams();
        await fetchDeleteRequests();
        setShowDeleteConfirm(false);
        setTeamToDelete(null);
      }
    } catch (err) {
      console.error('Failed to request team deletion');
    }
  };

  const handleDeleteRequestResponse = async (request, accept) => {
    try {
      const token = getToken();
      const requestId = request._id || request.id;
      const response = await fetch(`${API_URL}/teams/delete-requests/${requestId}/respond`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });
      if (response.ok) {
        await fetchDeleteRequests();
        await fetchMyTeams();
      }
    } catch (err) {
      console.error('Failed to respond to delete request');
    }
  };

  const goToTeamKanban = (team) => navigate(`/kanban/${team.project.slug}`);
  const closeModal = () => { setSelectedProject(null); setShowCreateTeam(false); resetTeamModal(); };

  const getStatusBadge = (userStatus) => {
    if (!userStatus) return { className: 'badge-not-started', text: 'Not Started' };
    if (userStatus.status === 'finished' && userStatus.validated) return { className: 'badge-completed', text: `${userStatus.finalMark}%` };
    if (userStatus.status === 'finished' && !userStatus.validated) return { className: 'badge-failed', text: 'Failed' };
    if (userStatus.status === 'in_progress') return { className: 'badge-active', text: 'In Progress' };
    if (userStatus.status === 'searching_a_group') return { className: 'badge-searching', text: 'Finding Team' };
    return { className: 'badge-active', text: userStatus.status };
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const validDeleteRequests = useMemo(() =>
    deleteRequests.filter(req => req.requestedBy?.login && req.teamName),
  [deleteRequests]);

  const actionableInvitesCount = pendingInvites.filter(i => i.myStatus === 'pending').length;
  const actionableDeleteCount = validDeleteRequests.filter(r => r.myStatus === 'pending').length;
  const totalRequestsCount = pendingInvites.length + validDeleteRequests.length;
  const actionableCount = actionableInvitesCount + actionableDeleteCount;
  const pendingFriendCount = pendingFriendRequests.incoming?.length || 0;

  const totalActive = userProjects.filter(p =>
    p.status === 'in_progress' || p.status === 'searching_a_group'
  ).length;

  const totalCompleted = userProjects.filter(p =>
    p.status === 'finished' && p['validated?']
  ).length;

  const titles = [
    "the Legendary", "the Mighty", "the Architect", "the Unstoppable",
    "the Bug Slayer", "the Chosen One", "the Code Wizard"
  ];

  const randomTitle = useMemo(() =>
    titles[Math.floor(Math.random() * titles.length)],
  []);

  const displayedFriends = friendSearch ? friendSearchResults : friends;

  return (
    <div className="full-dashboard">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">21</div>
          <div className="logo-text">Project Hub</div>
        </div>

        <nav className="nav-section">
          <a href="#" className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('dashboard'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </a>
          {totalRequestsCount > 0 && (
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setShowInvites(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 003-3V9a7 7 0 0114 0v5a3 3 0 003 3zm-8.27 4a2 2 0 01-3.46 0"/></svg>
              <span>Requests</span>
              <span className="badge">{actionableCount > 0 ? actionableCount : totalRequestsCount}</span>
            </a>
          )}
          <a href="#" className={`nav-item ${activeView === 'friends' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveView('friends'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span>Friends</span>
            {pendingFriendCount > 0 && <span className="badge">{pendingFriendCount}</span>}
          </a>
        </nav>

        <div className="nav-divider"></div>

        <nav className="nav-section">
          <a href="#" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>Chat</span>
          </a>
          <a href="#" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <circle cx="8" cy="12" r="2"/>
              <line x1="14" y1="10" x2="14" y2="10.01"/>
              <line x1="18" y1="12" x2="18" y2="12.01"/>
              <line x1="16" y1="14" x2="16" y2="14.01"/>
            </svg>
            <span>Games</span>
          </a>
        </nav>

        <div className="user-profile" ref={userMenuRef}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} className="user-avatar-img" />
          ) : (
            <div className="user-avatar">{getInitials(username)}</div>
          )}
          <div className="user-info">
            {user?.nickname && <div className="user-nickname">{user.nickname}</div>}
            <div className="user-login">@{username}</div>
          </div>
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="logout-dots" title="Options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {showUserMenu && (
            <div className="user-dropdown">
              <button className="dropdown-item" onClick={() => { setShowProfile(true); setShowUserMenu(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
              </button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item dropdown-danger" onClick={() => { handleLogout(); setShowUserMenu(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {activeView === 'dashboard' && (
          <>
            <div className="header">
              <div>
                <h1>{user?.nickname || username}, {randomTitle}</h1>
                <p>Here's what's happening with your projects</p>
              </div>
              <div className="header-actions">
                <span className="curriculum-badge">
                  {curriculum === 'old' ? 'C/C++' : curriculum === 'new' ? 'Python' : 'Detecting...'}
                </span>
              </div>
            </div>

            <div className="stats">
              <div className="stat-card">
                <div className="stat-value">{totalActive}</div>
                <div className="stat-label">Active</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{totalCompleted}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{wallet}</div>
                <div className="stat-label">Wallet</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{correctionPoints}</div>
                <div className="stat-label">Eval Points</div>
              </div>
            </div>

            <div className="info-card">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">Level</div>
                  <div className="info-value">{level.toFixed(2)}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Campus</div>
                  <div className="info-value">{campus}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Grade</div>
                  <div className="info-value">{grade}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Milestone</div>
                  <div className="info-value">{currentCircle}</div>
                </div>
              </div>
            </div>

            {isCadet && (
              <>
                <div className="section-header">
                  <h2>Milestones</h2>
                </div>

                <div className="circle-selector">
                  {[0, 1, 2, 3, 4, 5, 6].map(milestone => {
                    const stats = getCircleStats(milestone);
                    const isLocked = curriculum === 'unknown' && milestone > 1;
                    const isCurrent = milestone === currentCircle;
                    const isCompleted = milestone < currentCircle;
                    const isActive = milestone === activeCircle;

                    return (
                      <button
                        key={milestone}
                        className={`circle-btn ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${isCompleted ? 'complete' : ''} ${isLocked ? 'locked' : ''}`}
                        onClick={() => !isLocked && setSelectedCircle(milestone)}
                        disabled={isLocked}
                      >
                        <span className="circle-number">{milestone}</span>
                        {!isLocked && (
                          <span className="circle-progress">{stats.completed}/{stats.total}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {needsCurriculumDetection && activeCircle === 1 && (
                  <div className="curriculum-notice">
                    <p>Register for <strong>Born2beroot</strong> or <strong>push_swap</strong> on the intranet to unlock your curriculum path.</p>
                  </div>
                )}

                <div className="section-header">
                  <h2>Milestone {activeCircle} Projects</h2>
                </div>

                <div className="projects-grid">
                  {projectsLoading ? (
                    <div className="projects-loading-inline">Loading projects…</div>
                  ) : (
                    circleProjects.map((project, idx) => {
                      const badge = getStatusBadge(project.userStatus);
                      const activeTeam = myTeams.find(t => t.project.slug === project.slug && t.status === 'approved');
                      const pendingTeam = myTeams.find(t => t.project.slug === project.slug && t.status === 'pending');
                      const hasPendingTeam = !!pendingTeam;
                      const hasPendingInvite = hasIncomingPendingInvite(project.slug);
                      const isBlocked = hasPendingTeam || hasPendingInvite;

                      return (
                        <div
                          key={idx}
                          className={`project-card ${activeTeam ? 'has-team' : ''} ${isBlocked ? 'pending-team' : ''}`}
                          onClick={() => !activeTeam && !isBlocked && handleProjectClick(project)}
                        >
                          <div className="project-header">
                            <div className="project-icon">
                              {project.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className={`project-badge ${activeTeam ? 'badge-completed' : isBlocked ? 'badge-pending' : badge.className}`}>
                              {activeTeam ? 'Active Team' : hasPendingTeam ? `Pending (${pendingTeam.acceptanceCount}/${pendingTeam.totalMembers})` : hasPendingInvite ? 'Invite Pending' : badge.text}
                            </span>
                          </div>
                          <div className="project-name">{project.name}</div>
                          <div className="project-meta">
                            {project.team > 1 || project.minTeam > 1 ? 'Team' : 'Solo'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            <div className="section-header">
              <h2>My Teams</h2>
            </div>

            {myTeams.filter(t => t.status === 'approved' || t.isPending).length === 0 ? (
              <div className="empty-teams">
                <p>No active teams yet. Create a team by clicking on a team project above.</p>
              </div>
            ) : (
              <div className="teams-grid">
                {myTeams.filter(t => t.status === 'approved' || t.isPending).map(team => {
                  const isPendingDelete = !!(team.deleteRequest && team.deleteRequest.requestedBy);
                  const isPendingAcceptance = team.isPending && !isPendingDelete;

                  return (
                    <div
                      key={team._id || team.id}
                      className={`team-card ${isPendingDelete ? 'pending-delete' : ''} ${isPendingAcceptance ? 'pending-acceptance' : ''}`}
                      onClick={() => !isPendingDelete && !isPendingAcceptance && goToTeamKanban(team)}
                    >
                      {isPendingDelete && (
                        <div className="pending-badge">
                          Delete requested by @{team.deleteRequest.requestedByLogin}
                        </div>
                      )}
                      {isPendingAcceptance && (
                        <div className="pending-badge acceptance">
                          {team.acceptanceCount}/{team.totalMembers} accepted
                        </div>
                      )}
                      <div className="team-header">
                        <div className="team-avatars">
                          {team.members.slice(0, 3).map((member, idx) => (
                            member.avatar || member.user?.avatar ? (
                              <img key={idx} src={member.avatar || member.user.avatar} alt={member.login || member.user.login} className="team-header-avatar" title={member.login || member.user.login} />
                            ) : (
                              <div key={idx} className="team-header-placeholder" title={member.login || member.user.login}>
                                {(member.login || member.user.login).slice(0, 2).toUpperCase()}
                              </div>
                            )
                          ))}
                        </div>
                        <div className="team-info">
                          <div className="team-name">{team.name}</div>
                          <div className="team-project">{team.project.name}</div>
                        </div>
                        {!isPendingDelete && !isPendingAcceptance && (
                          <button className="team-delete" onClick={(e) => handleDeleteTeam(team, e)} title="Request team deletion">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isTranscender && (
              <>
                <div className="section-header">
                  <h2>Core Selection</h2>
                </div>

                <div className="core-selector">
                  <button className={`core-btn ${activeSection === 'cc' ? 'active' : ''}`} onClick={() => setActiveSection('cc')}>
                    <span className="core-label">CC</span>
                    <span className="core-sublabel">Common Core</span>
                  </button>
                  <button className={`core-btn ${activeSection === 'oc' ? 'active' : ''}`} onClick={() => setActiveSection('oc')}>
                    <span className="core-label">OC</span>
                    <span className="core-sublabel">Outer Core</span>
                  </button>
                </div>

                {activeSection === 'cc' && (
                  <div className="cc-congrats-section">
                    <div className="congrats-card">
                      <div className="congrats-icon">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                          <line x1="9" y1="9" x2="9.01" y2="9"/>
                          <line x1="15" y1="9" x2="15.01" y2="9"/>
                        </svg>
                      </div>
                      <h2>Congratulations {username}</h2>
                      <p className="congrats-main">you survived being a slave to the Black Hole.</p>
                      <p className="congrats-sub">The Common Core couldn't break you. Now go touch some grass before diving into the Outer Core... or don't, we're not your parents.</p>
                      <div className="congrats-stats">
                        <div className="congrats-stat"><span className="stat-number">∞</span><span className="stat-label">Debugging Hours</span></div>
                        <div className="congrats-stat"><span className="stat-number">42</span><span className="stat-label">Coffees Consumed</span></div>
                        <div className="congrats-stat"><span className="stat-number">{totalCompleted}</span><span className="stat-label">Projects Conquered</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'oc' && (
                  <>
                    <div className="section-header">
                      <h2>Outer Core Projects</h2>
                    </div>
                    {outerCoreProjects.length > 0 ? (
                      <div className="projects-grid">
                        {outerCoreProjects.map((project, idx) => {
                          const badge = getStatusBadge(project.userStatus);
                          const activeTeam = myTeams.find(t => t.project.slug === project.slug && t.status === 'approved');
                          const pendingTeam = myTeams.find(t => t.project.slug === project.slug && t.status === 'pending');
                          const hasPendingTeam = !!pendingTeam;
                          const hasPendingInvite = hasIncomingPendingInvite(project.slug);
                          const isBlocked = hasPendingTeam || hasPendingInvite;

                          return (
                            <div
                              key={idx}
                              className={`project-card ${activeTeam ? 'has-team' : ''} ${isBlocked ? 'pending-team' : ''}`}
                              onClick={() => !activeTeam && !isBlocked && handleProjectClick(project)}
                            >
                              <div className="project-header">
                                <div className="project-icon">
                                  {project.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className={`project-badge ${activeTeam ? 'badge-completed' : isBlocked ? 'badge-pending' : badge.className}`}>
                                  {activeTeam ? 'Active Team' : hasPendingTeam ? `Pending (${pendingTeam.acceptanceCount}/${pendingTeam.totalMembers})` : hasPendingInvite ? 'Invite Pending' : badge.text}
                                </span>
                              </div>
                              <div className="project-name">{project.name}</div>
                              <div className="project-meta">Outer Core</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h3>No Outer Core Projects</h3>
                        <p>Register for projects on the intranet and they'll appear here automatically.</p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {activeView === 'friends' && (
          <>
            <div className="header">
              <div>
                <h1>Friends</h1>
                <p>{friends.length} friend{friends.length !== 1 ? 's' : ''}{pendingFriendCount > 0 ? ` · ${pendingFriendCount} pending` : ''}</p>
              </div>
            </div>

            <div className="friends-tabs">
              <button className={`friends-tab ${friendsTab === 'friends' ? 'active' : ''}`} onClick={() => setFriendsTab('friends')}>
                My Friends ({friends.length})
              </button>
              <button className={`friends-tab ${friendsTab === 'add' ? 'active' : ''}`} onClick={() => setFriendsTab('add')}>
                Add Friend
              </button>
              <button className={`friends-tab ${friendsTab === 'pending' ? 'active' : ''}`} onClick={() => setFriendsTab('pending')}>
                Pending {pendingFriendCount > 0 && <span className="tab-badge">{pendingFriendCount}</span>}
              </button>
            </div>

            {friendsTab === 'friends' && (
              <div className="friends-section">
                <div className="friends-search-bar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search friends by name, username, or nickname..."
                    className="friends-search-input"
                    value={friendSearch}
                    onChange={(e) => { setFriendSearch(e.target.value); handleFriendSearch(e.target.value); }}
                  />
                  {friendSearch && <button className="friends-search-clear" onClick={() => { setFriendSearch(''); setFriendSearchResults([]); }}>×</button>}
                </div>

                {displayedFriends.length > 0 ? (
                  <div className="friends-grid">
                    {displayedFriends.map(friend => (
                      <div key={friend.friendshipId} className="friend-card">
                        <div className="friend-card-inner">
                          {friend.effectiveAvatar ? (
                            <img src={friend.effectiveAvatar} alt={friend.login} className="friend-avatar" />
                          ) : (
                            <div className="friend-avatar-placeholder">{friend.login?.slice(0, 2).toUpperCase()}</div>
                          )}
                          <div className="friend-details">
                            <div className="friend-name">{friend.nickname || friend.displayName || friend.login}</div>
                            <div className="friend-login">@{friend.login}</div>
                            <div className="friend-meta">{friend.campus} · Level {friend.level?.toFixed(2)}</div>
                          </div>
                          <button className="friend-remove" onClick={() => handleRemoveFriendClick(friend)} title="Remove friend">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>{friendSearch ? 'No matches found' : 'No friends yet'}</h3>
                    <p>{friendSearch ? 'Try a different search' : 'Add friends using the "Add Friend" tab'}</p>
                  </div>
                )}
              </div>
            )}

            {friendsTab === 'add' && (
              <div className="friends-section">
                <div className="friends-search-bar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    type="text"
                    placeholder="Search users by login, name, or nickname..."
                    className="friends-search-input"
                    value={addUserSearch}
                    onChange={(e) => { setAddUserSearch(e.target.value); handleAddFriendSearch(e.target.value); }}
                  />
                  {addUserSearch && <button className="friends-search-clear" onClick={() => { setAddUserSearch(''); setAddUserResults([]); }}>×</button>}
                </div>

                {addUserResults.length > 0 ? (
                  <div className="friends-grid">
                    {addUserResults.map(userResult => (
                      <div key={userResult.id} className="friend-card">
                        <div className="friend-card-inner">
                          {userResult.effectiveAvatar ? (
                            <img src={userResult.effectiveAvatar} alt={userResult.login} className="friend-avatar" />
                          ) : (
                            <div className="friend-avatar-placeholder">{userResult.login?.slice(0, 2).toUpperCase()}</div>
                          )}
                          <div className="friend-details">
                            <div className="friend-name">{userResult.nickname || userResult.displayName || userResult.login}</div>
                            <div className="friend-login">@{userResult.login}</div>
                            <div className="friend-meta">{userResult.campus} · Level {userResult.level?.toFixed(2)}</div>
                          </div>
                          {userResult.friendStatus === 'none' && (
                            <button className="btn-friend-add" onClick={() => sendFriendRequest(userResult.id)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Add
                            </button>
                          )}
                          {userResult.friendStatus === 'sent' && (
                            <span className="friend-status-badge sent">Pending</span>
                          )}
                          {userResult.friendStatus === 'received' && (
                            <button className="btn-friend-add" onClick={() => respondToFriendRequest(userResult.friendshipId, true)}>Accept</button>
                          )}
                          {userResult.friendStatus === 'friends' && (
                            <span className="friend-status-badge friends">Friends</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : addUserSearch.length >= 2 && !addUserSearching ? (
                  <div className="empty-state">
                    <h3>No users found</h3>
                    <p>Try a different search term</p>
                  </div>
                ) : !addUserSearch ? (
                  <div className="empty-state">
                    <h3>Search for users</h3>
                    <p>Type at least 2 characters to search</p>
                  </div>
                ) : null}
              </div>
            )}

            {friendsTab === 'pending' && (
              <div className="friends-section">
                {pendingFriendRequests.incoming?.length > 0 && (
                  <>
                    <h3 className="friends-subsection-title">Incoming Requests</h3>
                    <div className="friends-grid">
                      {pendingFriendRequests.incoming.map(req => (
                        <div key={req.friendshipId} className="friend-card">
                          <div className="friend-card-inner">
                            {req.effectiveAvatar ? (
                              <img src={req.effectiveAvatar} alt={req.login} className="friend-avatar" />
                            ) : (
                              <div className="friend-avatar-placeholder">{req.login?.slice(0, 2).toUpperCase()}</div>
                            )}
                            <div className="friend-details">
                              <div className="friend-name">{req.nickname || req.displayName || req.login}</div>
                              <div className="friend-login">@{req.login}</div>
                              <div className="friend-meta">{req.campus} · Level {req.level?.toFixed(2)}</div>
                            </div>
                            <div className="friend-actions">
                              <button className="btn-accept" onClick={() => respondToFriendRequest(req.friendshipId, true)}>Accept</button>
                              <button className="btn-decline" onClick={() => respondToFriendRequest(req.friendshipId, false)}>Decline</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {pendingFriendRequests.outgoing?.length > 0 && (
                  <>
                    <h3 className="friends-subsection-title">Sent Requests</h3>
                    <div className="friends-grid">
                      {pendingFriendRequests.outgoing.map(req => (
                        <div key={req.friendshipId} className="friend-card">
                          <div className="friend-card-inner">
                            {req.effectiveAvatar ? (
                              <img src={req.effectiveAvatar} alt={req.login} className="friend-avatar" />
                            ) : (
                              <div className="friend-avatar-placeholder">{req.login?.slice(0, 2).toUpperCase()}</div>
                            )}
                            <div className="friend-details">
                              <div className="friend-name">{req.nickname || req.displayName || req.login}</div>
                              <div className="friend-login">@{req.login}</div>
                            </div>
                            <span className="friend-status-badge sent">Pending</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(pendingFriendRequests.incoming?.length === 0 && pendingFriendRequests.outgoing?.length === 0) && (
                  <div className="empty-state">
                    <h3>No pending requests</h3>
                    <p>Friend requests you send or receive will appear here</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-banner">
              <button className="profile-modal-close" onClick={() => setShowProfile(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="profile-modal-avatar-area">
              <div
                className="profile-modal-avatar-wrapper"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileAvatarPreview ? (
                  <img src={profileAvatarPreview} alt="Preview" className="profile-modal-avatar-img" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={username} className="profile-modal-avatar-img" />
                ) : (
                  <div className="profile-modal-avatar-placeholder">{getInitials(username)}</div>
                )}
                <div className="profile-modal-avatar-hover">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarChange} style={{ display: 'none' }} />
              {user?.customAvatar && (
                <button className="btn-reset-avatar" onClick={handleResetAvatar} disabled={profileSaving}>
                  Reset to intra photo
                </button>
              )}
            </div>

            <div className="profile-modal-body">
              <div className="profile-identity">
                <div className="profile-identity-name">{user?.nickname || user?.displayName || username}</div>
                <div className="profile-identity-login">@{username}</div>
              </div>

              <div className="profile-edit-section">
                <label className="profile-label">Nickname</label>
                <input
                  type="text"
                  className="profile-input"
                  value={profileNickname}
                  onChange={(e) => setProfileNickname(e.target.value)}
                  placeholder="Choose a nickname..."
                  maxLength={20}
                />
                <span className="profile-hint">{profileNickname.length}/20 · Letters, numbers, _ and -</span>
              </div>

              <div className="profile-divider"></div>
              <div className="profile-readonly-title">42 Intra Info</div>

              <div className="profile-info-grid">
                <div className="profile-field-readonly">
                  <label className="profile-label">Full Name</label>
                  <div className="profile-value">{user?.displayName || '—'}</div>
                </div>
                <div className="profile-field-readonly">
                  <label className="profile-label">Login</label>
                  <div className="profile-value">@{username}</div>
                </div>
                <div className="profile-field-readonly">
                  <label className="profile-label">Email</label>
                  <div className="profile-value">{user?.email || '—'}</div>
                </div>
                <div className="profile-field-readonly">
                  <label className="profile-label">Campus</label>
                  <div className="profile-value">{campus}</div>
                </div>
              </div>

              {profileError && <div className="profile-message error">{profileError}</div>}
              {profileSuccess && <div className="profile-message success">{profileSuccess}</div>}
            </div>

            <div className="profile-modal-footer">
              <button className="btn-secondary" onClick={() => setShowProfile(false)}>Close</button>
              <button className={`btn-primary ${profileSaving ? 'btn-disabled' : ''}`} onClick={handleProfileSave} disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteFriendConfirm && friendToDelete && (
        <div className="modal-overlay" onClick={() => { setShowDeleteFriendConfirm(false); setFriendToDelete(null); }}>
          <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remove Friend?</h2>
              <button className="modal-close" onClick={() => { setShowDeleteFriendConfirm(false); setFriendToDelete(null); }}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove <strong>@{friendToDelete.login}</strong> from your friends?</p>
              <p>You can always add them back later.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setShowDeleteFriendConfirm(false); setFriendToDelete(null); }}>Cancel</button>
              <button className="btn-danger" onClick={confirmRemoveFriend}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {showCreateTeam && selectedProject && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Team</h2>
              <button className="modal-close" onClick={closeModal}>x</button>
            </div>
            <div className="modal-body">
              <p><strong>{selectedProject.name}</strong></p>
              <p>Team size: {selectedProject.minTeam}{selectedProject.maxTeam && selectedProject.maxTeam !== selectedProject.minTeam ? `-${selectedProject.maxTeam}` : ''} members (you + {minMembers}{maxMembers !== minMembers ? `-${maxMembers}` : ''} others)</p>

              <div className="team-form">
                <input
                  type="text"
                  placeholder="Team name *"
                  className={`team-input ${!teamName.trim() ? 'input-required' : ''}`}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />

                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search member by login..."
                    className="team-input"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    disabled={selectedMembers.length >= maxMembers}
                  />
                  {searching && searchQuery.length > 0 && <div className="search-loading">Searching...</div>}
                  {selectedMembers.length >= maxMembers && (
                    <div className="max-members-reached">Maximum team members reached</div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map(result => (
                        <div key={result.id} className="search-result-item" onClick={() => addMember(result)}>
                          {result.avatar ? (
                            <img src={result.avatar} alt={result.login} className="result-avatar" />
                          ) : (
                            <div className="result-avatar-placeholder">{result.login.slice(0, 2).toUpperCase()}</div>
                          )}
                          <div className="result-info">
                            <span className="result-login">{result.login}</span>
                            <span className="result-details">{result.campus} - Level {result.level?.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="selected-members">
                  <p>Team Members: {selectedMembers.length}/{minMembers}{maxMembers !== minMembers ? `-${maxMembers}` : ''}</p>
                  {selectedMembers.length < minMembers && (
                    <div className="no-members">Add at least {minMembers} member{minMembers > 1 ? 's' : ''} to continue</div>
                  )}
                  {selectedMembers.map(member => (
                    <div key={member.id} className="selected-member">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.login} className="member-avatar" />
                      ) : (
                        <div className="member-avatar-placeholder">{member.login.slice(0, 2).toUpperCase()}</div>
                      )}
                      <span>{member.login}</span>
                      <button className="remove-member" onClick={() => removeMember(member.id)}>x</button>
                    </div>
                  ))}
                </div>
              </div>
              {teamError && <div className="profile-message error">{teamError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                className={`btn-primary ${!canCreateTeam || isCreatingTeam ? 'btn-disabled' : ''}`}
                onClick={handleTeamCreated}
                disabled={!canCreateTeam || isCreatingTeam}
              >
                {isCreatingTeam ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && teamToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Team?</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{teamToDelete.name}</strong>?</p>
              <p>All team members will need to approve this deletion request.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDeleteTeam}>Request Delete</button>
            </div>
          </div>
        </div>
      )}

      {showInvites && (
        <div className="modal-overlay" onClick={() => setShowInvites(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Team Requests</h2>
              <button className="modal-close" onClick={() => setShowInvites(false)}>×</button>
            </div>
            <div className="modal-body">
              {pendingInvites.length === 0 && validDeleteRequests.length === 0 ? (
                <p>No pending requests</p>
              ) : (
                <div className="requests-container">
                  {pendingInvites.length > 0 && (
                    <>
                      <h3 className="requests-section-title">Team Invitations</h3>
                      <div className="invites-list">
                        {pendingInvites.map(invite => {
                          const alreadyAccepted = invite.myStatus === 'approved';
                          return (
                            <div key={invite._id || invite.id} className={`invite-item ${alreadyAccepted ? 'responded' : ''}`}>
                              <div className="invite-info">
                                <div className="invite-team-name">{invite.name}</div>
                                <div className="invite-project">{invite.project.name}</div>
                                <div className="invite-creator">
                                  by @{invite.creator?.login} ({invite.acceptanceCount || 0}/{invite.totalMembers || 0} accepted)
                                </div>
                              </div>
                              <div className="invite-actions">
                                {alreadyAccepted ? (
                                  <span className="response-badge accepted">Accepted</span>
                                ) : (
                                  <>
                                    <button className="btn-accept" onClick={() => handleInviteResponse(invite, true)}>Accept</button>
                                    <button className="btn-decline" onClick={() => handleInviteResponse(invite, false)}>Decline</button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {validDeleteRequests.length > 0 && (
                    <>
                      <h3 className="requests-section-title">Deletion Requests</h3>
                      <div className="invites-list">
                        {validDeleteRequests.map(request => {
                          const alreadyApproved = request.myStatus === 'approved';
                          const alreadyRejected = request.myStatus === 'rejected';
                          const alreadyResponded = alreadyApproved || alreadyRejected;
                          return (
                            <div key={request._id || request.id} className={`invite-item delete-request ${alreadyResponded ? 'responded' : ''}`}>
                              <div className="invite-info">
                                <div className="invite-team-name">{request.teamName}</div>
                                <div className="invite-project">{request.project?.name}</div>
                                <div className="invite-creator">@{request.requestedBy?.login} wants to delete ({request.approvalCount}/{request.totalMembers} approved)</div>
                              </div>
                              <div className="invite-actions">
                                {alreadyApproved ? (
                                  <span className="response-badge accepted">Approved</span>
                                ) : alreadyRejected ? (
                                  <span className="response-badge declined">Rejected</span>
                                ) : (
                                  <>
                                    <button className="btn-accept" onClick={() => handleDeleteRequestResponse(request, true)}>Approve</button>
                                    <button className="btn-decline" onClick={() => handleDeleteRequestResponse(request, false)}>Reject</button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullDashboard;
