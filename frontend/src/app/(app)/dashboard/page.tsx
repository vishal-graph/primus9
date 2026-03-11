/**
 * TatvaOps Vision - Dashboard (StudioPlan UI)
 *
 * Interior Design Projects Dashboard: header with search/filters,
 * project grid + Create New Project card. New Project opens UploadModal;
 * upload success redirects to /upload/success.
 * Design: StudioPlan palette (violet primary, dark theme).
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  alpha,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  DarkMode,
  LightMode,
  ViewModule,
  ViewList,
  Sort,
  FilterList,
  MoreHoriz,
  Star,
  StarBorder,
  Delete,
  Archive,
  Refresh,
} from '@mui/icons-material';
import { UploadModal, type PlanOption } from '@/components/upload/UploadModal';
import { UploadingOverlay } from '@/components/upload/UploadingOverlay';
import { getProjects, Project, deleteProject, archiveProject, favoriteProject } from '@/lib/actions/projects';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { EmptyState } from '@/ui/feedback/EmptyState';

// StudioPlan palette
const PRIMARY = '#8B5CF6';
const PRIMARY_HOVER = '#7C3AED';
const BG_LIGHT = '#F3F4F6';
const BG_DARK = '#0F0F11';
const SURFACE_LIGHT = '#FFFFFF';
const SURFACE_DARK = '#18181B';
const BORDER_LIGHT = '#E5E7EB';
const BORDER_DARK = '#27272A';
const TEXT_MAIN_LIGHT = '#111827';
const TEXT_MAIN_DARK = '#FAFAFA';
const TEXT_SEC_LIGHT = '#6B7280';
const TEXT_SEC_DARK = '#A1A1AA';

type ViewMode = 'grid' | 'list';
type ProjectFilter = 'active' | 'favorites' | 'archived';

/** ID prefix for project card elements so hash / scroll-to works (e.g. #project-abc) */
const PROJECT_CARD_ID_PREFIX = 'project-';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollToProjectIdRef = useRef<() => void>(() => {});

  const [darkMode, setDarkMode] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showUploadingOverlay, setShowUploadingOverlay] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('active');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUserAndPlans = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const [userRes, plansRes] = await Promise.all([
          fetch('/api/user/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/plans', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const userData = await userRes.json();
        const plansData = await plansRes.json();
        if (userData.success) setIsInternal(userData.data?.isInternal ?? false);
        if (plansData.success && Array.isArray(plansData.data)) setPlans(plansData.data);
      } catch {
        // ignore
      }
    };
    fetchUserAndPlans();
  }, [getToken]);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getProjects();
    if (result.success && result.data) setProjects(result.data);
    else setError(result.error || 'Failed to load projects');
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleUploadStarted = () => {
    setShowUploadingOverlay(true);
  };

  const handleUploadFailed = () => {
    setShowUploadingOverlay(false);
  };

  const handleUploadSuccess = (slug: string) => {
    setUploadModalOpen(false);
    setShowUploadingOverlay(false);
    router.push(`/project/${slug}/processing`);
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    switch (projectFilter) {
      case 'active':
        matchesFilter = !project.isArchived;
        break;
      case 'archived':
        matchesFilter = project.isArchived === true;
        break;
      case 'favorites':
        matchesFilter = project.isFavorite === true && !project.isArchived;
        break;
    }
    return matchesSearch && matchesFilter;
  });

  // Scroll to project when URL hash is #project-<id> or ?scrollTo=<id>
  const scrollToProjectId = () => {
    if (isLoading || filteredProjects.length === 0 || !contentRef.current) return;
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    const scrollToParam = searchParams.get('scrollTo');
    const targetId = scrollToParam
      ? `${PROJECT_CARD_ID_PREFIX}${scrollToParam}`
      : hash.startsWith(PROJECT_CARD_ID_PREFIX)
        ? hash
        : null;
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el && contentRef.current.contains(el)) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };
  scrollToProjectIdRef.current = scrollToProjectId;

  useEffect(() => {
    scrollToProjectIdRef.current();
  }, [isLoading, filteredProjects.length, searchParams]);

  useEffect(() => {
    const onHashChange = () => scrollToProjectIdRef.current();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const handleProjectClick = (project: any) => {
    const slug = project.slug || project.id;
    router.push(`/project/${slug}/floor-plan`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedProject(null);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteConfirm = async () => {
    if (selectedProject) {
      const result = await deleteProject(selectedProject.id);
      if (result.success) setProjects((prev) => prev.filter((p) => p.id !== selectedProject.id));
    }
    setDeleteDialogOpen(false);
    setSelectedProject(null);
  };

  const handleArchive = async () => {
    if (selectedProject) {
      const newArchived = !selectedProject.isArchived;
      const result = await archiveProject(selectedProject.id, newArchived);
      if (result.success)
        setProjects((prev) =>
          prev.map((p) => (p.id === selectedProject.id ? { ...p, isArchived: newArchived } : p))
        );
    }
    handleMenuClose();
  };

  const handleToggleFavorite = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    favoriteProject(project.id, !project.isFavorite).then((result) => {
      if (result.success)
        setProjects((prev) =>
          prev.map((p) => (p.id === project.id ? { ...p, isFavorite: !p.isFavorite } : p))
        );
    });
  };

  const isDark = darkMode;
  const bg = isDark ? BG_DARK : BG_LIGHT;
  const surface = isDark ? SURFACE_DARK : SURFACE_LIGHT;
  const border = isDark ? BORDER_DARK : BORDER_LIGHT;
  const textMain = isDark ? TEXT_MAIN_DARK : TEXT_MAIN_LIGHT;
  const textSec = isDark ? TEXT_SEC_DARK : TEXT_SEC_LIGHT;

  const scrollbarSx = {
    '&::-webkit-scrollbar': { width: 8, height: 8 },
    '&::-webkit-scrollbar-track': { background: 'transparent' },
    '&::-webkit-scrollbar-thumb': { background: isDark ? '#3f3f46' : BORDER_LIGHT, borderRadius: 4 },
    '&::-webkit-scrollbar-thumb:hover': { background: isDark ? '#52525b' : TEXT_SEC_LIGHT },
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', bgcolor: bg, ...scrollbarSx }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
        <Box sx={{ height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, md: 4 }, bgcolor: alpha(bg, 0.8), backdropFilter: 'blur(12px)', borderBottom: 1, borderColor: border }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: textMain }}>Projects</Typography>
            <Typography variant="body2" sx={{ color: textSec }}>Manage your interior design portfolio</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => setDarkMode((d) => !d)} sx={{ color: textSec, '&:hover': { color: textMain } }} size="small">
              {isDark ? <LightMode /> : <DarkMode />}
            </IconButton>
            <Button variant="contained" startIcon={<Add />} onClick={() => setUploadModalOpen(true)} sx={{ bgcolor: PRIMARY, color: '#fff', boxShadow: `0 4px 14px ${alpha(PRIMARY, 0.4)}`, '&:hover': { bgcolor: PRIMARY_HOVER }, textTransform: 'none', fontWeight: 600 }}>
              New Project
            </Button>
          </Box>
        </Box>

        {/* Toolbar: one row, search | filters | sort/view */}
        <Box sx={{ flexShrink: 0, px: { xs: 2, md: 4 }, py: 2, borderBottom: 1, borderColor: border, bgcolor: alpha(surface, 0.5) }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
            <TextField
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: { xs: 'none', sm: '1' }, maxWidth: { sm: 320 }, '& .MuiOutlinedInput-root': { bgcolor: surface, borderRadius: 2, '& fieldset': { borderColor: border } } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: textSec, fontSize: 20 }} /></InputAdornment> }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography component="span" sx={{ fontSize: 12, color: textSec, mr: 0.5, display: { xs: 'none', sm: 'block' } }}>Show:</Typography>
              <Box sx={{ display: 'flex', bgcolor: surface, borderRadius: 1.5, p: 0.5, border: 1, borderColor: border }}>
                {(['active', 'favorites', 'archived'] as const).map((f) => (
                  <Button key={f} size="small" onClick={() => setProjectFilter(f)} sx={{ textTransform: 'none', fontSize: 12, fontWeight: 500, px: 2, py: 1, borderRadius: 1, minWidth: 0, bgcolor: projectFilter === f ? (isDark ? alpha(PRIMARY, 0.2) : alpha(PRIMARY, 0.08)) : 'transparent', color: projectFilter === f ? textMain : textSec }}>
                    {f === 'active' ? 'Active' : f === 'favorites' ? 'Favorites' : 'Archived'}
                  </Button>
                ))}
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Button size="small" startIcon={<Sort />} sx={{ color: textSec, fontSize: 12, textTransform: 'none' }}>Date</Button>
                <Button size="small" startIcon={<FilterList />} sx={{ color: textSec, fontSize: 12, textTransform: 'none' }}>Phase</Button>
              </Box>
              <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ border: 1, borderColor: border, borderRadius: 1, overflow: 'hidden', '& .MuiToggleButton-root': { border: 'none', color: textSec, px: 1.5 } }}>
                <ToggleButton value="grid" aria-label="Grid"><ViewModule sx={{ fontSize: 18 }} /></ToggleButton>
                <ToggleButton value="list" aria-label="List"><ViewList sx={{ fontSize: 18 }} /></ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>

        {/* Content area with result count (ref for scroll-into-view); minHeight: 0 so flex child can scroll */}
        <Box ref={contentRef} sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: { xs: 2, md: 4 }, py: 3, pb: 4, ...scrollbarSx }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={fetchProjects} startIcon={<Refresh />}>Retry</Button>}>
              {error}
            </Alert>
          )}
          {isLoading ? (
            <>
              <Typography variant="body2" sx={{ color: textSec, mb: 2 }}>Loading projects...</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="rectangular" height={280} sx={{ borderRadius: 2 }} />)}
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" sx={{ color: textSec }}>
                  {filteredProjects.length === 0 ? 'No projects' : `${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'}`}
                </Typography>
              </Box>
              {viewMode === 'list' ? (
            <Box sx={{ border: 1, borderColor: border, borderRadius: 2, overflow: 'hidden', bgcolor: surface }}>
              {filteredProjects.length === 0 ? (
                <EmptyState icon={<Add sx={{ fontSize: 40, color: 'primary.main' }} />} title="No projects yet" description="Create your first project by uploading a floor plan or starting from scratch." actionLabel="Create project" onAction={() => setUploadModalOpen(true)} />
              ) : (
                filteredProjects.map((project) => (
                  <Box key={project.id} id={`${PROJECT_CARD_ID_PREFIX}${project.id}`} onClick={() => handleProjectClick(project)} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2, borderBottom: 1, borderColor: border, cursor: 'pointer', '&:hover': { bgcolor: isDark ? alpha(SURFACE_DARK, 0.6) : alpha(BORDER_LIGHT, 0.5) } }}>
                    <Box sx={{ width: 80, height: 60, mr: 2, borderRadius: 1, overflow: 'hidden', bgcolor: border }}>{project.floorPlanUrl ? <Box component="img" src={project.floorPlanUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 600, color: textMain }}>{project.name}</Typography>
                      <Typography variant="caption" sx={{ color: textSec }}>Updated {formatDate(project.updatedAt)}</Typography>
                    </Box>
                    <IconButton size="small" onClick={(e) => handleToggleFavorite(e, project)}>{project.isFavorite ? <Star sx={{ color: '#eab308' }} /> : <StarBorder />}</IconButton>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, project)}><MoreHoriz /></IconButton>
                  </Box>
                ))
              )}
            </Box>
              ) : filteredProjects.length === 0 ? (
                <EmptyState icon={<Add sx={{ fontSize: 40, color: 'primary.main' }} />} title="No projects yet" description="Create your first project by uploading a floor plan or starting from scratch." actionLabel="Create project" onAction={() => setUploadModalOpen(true)} />
              ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 3 }}>
              <Box onClick={() => setUploadModalOpen(true)} sx={{ minHeight: 280, borderRadius: 2, border: 2, borderStyle: 'dashed', borderColor: border, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, cursor: 'pointer', '&:hover': { borderColor: PRIMARY, bgcolor: alpha(PRIMARY, 0.05) } }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, color: textSec }}><Add sx={{ fontSize: 28 }} /></Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: textMain }}>New project</Typography>
                <Typography variant="caption" sx={{ color: textSec, textAlign: 'center' }}>Upload or start from scratch</Typography>
              </Box>
              {filteredProjects.map((project) => (
                <Box key={project.id} id={`${PROJECT_CARD_ID_PREFIX}${project.id}`} sx={{ minHeight: 0 }}>
                  <ProjectCard project={project} onFavoriteToggle={(e) => handleToggleFavorite(e, project)} onMenuOpen={(e) => handleMenuOpen(e, project)} onClick={() => handleProjectClick(project)} formatDate={formatDate} />
                </Box>
              ))}
            </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      <UploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUploadStarted={handleUploadStarted} onUploadFailed={handleUploadFailed} onSuccess={handleUploadSuccess} isInternal={isInternal} plans={plans} />
      {showUploadingOverlay && <UploadingOverlay />}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <MenuItem onClick={() => { selectedProject && handleToggleFavorite({ stopPropagation: () => {} } as React.MouseEvent, selectedProject); handleMenuClose(); }}>
          <ListItemIcon>{selectedProject?.isFavorite ? <Star /> : <StarBorder />}</ListItemIcon>
          <ListItemText>{selectedProject?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleArchive}><ListItemIcon><Archive /></ListItemIcon><ListItemText>{selectedProject?.isArchived ? 'Unarchive' : 'Archive'}</ListItemText></MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}><ListItemIcon><Delete sx={{ color: 'error.main' }} /></ListItemIcon><ListItemText>Delete</ListItemText></MenuItem>
      </Menu>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent><Typography>Are you sure you want to delete <strong>{selectedProject?.name}</strong>? This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
