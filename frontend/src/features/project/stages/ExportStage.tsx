/**
 * TatvaOps Vision - Export Stage
 * 
 * Features:
 * - Export options (ZIP, PDF)
 * - Version selection
 * - Signed download links
 * - Export customization
 * 
 * Design: Clean checklist, Dropbox/Google Drive-like download UX
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Grid,
  alpha,
} from '@mui/material';
import {
  Download,
  FolderZip,
  PictureAsPdf,
  Image,
  Description,
  CheckCircle,
} from '@mui/icons-material';
import { slideFromBottomVariants } from '@/motion/pageTransitions';

interface ExportStageProps {
  projectId: string;
}

export function ExportStage({ projectId }: ExportStageProps) {
  const [exportOptions, setExportOptions] = useState({
    floorPlan: true,
    moodboards: true,
    elevations: true,
    interiorViews: true,
    componentList: true,
    designSpec: true,
  });

  const [exportFormat, setExportFormat] = useState<'zip' | 'pdf'>('zip');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(0);

    // TODO: Call server action to generate export package
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          // Auto-download would trigger here
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const toggleOption = (option: keyof typeof exportOptions) => {
    setExportOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  const exportItems = [
    { key: 'floorPlan' as const, label: 'Floor Plan', icon: <Image /> },
    { key: 'moodboards' as const, label: 'Moodboards', icon: <Image /> },
    { key: 'elevations' as const, label: 'Elevations', icon: <Image /> },
    { key: 'interiorViews' as const, label: 'Interior Views', icon: <Image /> },
    { key: 'componentList' as const, label: 'Component List', icon: <Description /> },
    { key: 'designSpec' as const, label: 'Design Specification', icon: <Description /> },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Export Project
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Download your complete design package
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Export Format */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            component={motion.div}
            variants={slideFromBottomVariants}
            initial="hidden"
            animate="visible"
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, backgroundColor: 'background.elevated' }}>
              <Typography variant="body2" fontWeight={600}>
                Export Format
              </Typography>
            </Box>
            
            <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
              <Card
                elevation={0}
                onClick={() => setExportFormat('zip')}
                sx={{
                  flexGrow: 1,
                  cursor: 'pointer',
                  border: 2,
                  borderColor: exportFormat === 'zip' ? 'primary.main' : 'divider',
                  backgroundColor: exportFormat === 'zip' ? alpha('#5C6BC0', 0.05) : 'background.paper',
                  transition: 'all 0.2s',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <FolderZip sx={{ fontSize: 48, color: exportFormat === 'zip' ? 'primary.main' : 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" fontWeight={600}>
                    ZIP Archive
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    All files organized
                  </Typography>
                </CardContent>
              </Card>

              <Card
                elevation={0}
                onClick={() => setExportFormat('pdf')}
                sx={{
                  flexGrow: 1,
                  cursor: 'pointer',
                  border: 2,
                  borderColor: exportFormat === 'pdf' ? 'primary.main' : 'divider',
                  backgroundColor: exportFormat === 'pdf' ? alpha('#5C6BC0', 0.05) : 'background.paper',
                  transition: 'all 0.2s',
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <PictureAsPdf sx={{ fontSize: 48, color: exportFormat === 'pdf' ? 'primary.main' : 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" fontWeight={600}>
                    PDF Report
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Presentation-ready
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Paper>
        </Grid>

        {/* Export Items */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, backgroundColor: 'background.elevated' }}>
              <Typography variant="body2" fontWeight={600}>
                Include in Export
              </Typography>
            </Box>

            <List>
              {exportItems.map((item, index) => (
                <Box key={item.key}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions[item.key]}
                          onChange={() => toggleOption(item.key)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.icon}
                          <Typography variant="body2">{item.label}</Typography>
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Export Summary */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: alpha('#66BB6A', 0.05),
              border: 1,
              borderColor: alpha('#66BB6A', 0.2),
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <CheckCircle sx={{ color: 'success.main' }} />
              <Typography variant="body2" fontWeight={600}>
                Ready to Export
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Your package will include {Object.values(exportOptions).filter(Boolean).length} items
              as a {exportFormat.toUpperCase()} file.
              Estimated size: ~50 MB
            </Typography>
          </Paper>
        </Grid>

        {/* Export Progress */}
        {isExporting && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              component={motion.div}
              variants={slideFromBottomVariants}
              initial="hidden"
              animate="visible"
              sx={{
                p: 3,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" gutterBottom>
                Preparing your export...
              </Typography>
              <LinearProgress variant="determinate" value={exportProgress} sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {exportProgress}% complete
              </Typography>
            </Paper>
          </Grid>
        )}

        {/* Export Button */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<Download />}
            onClick={handleExport}
            disabled={isExporting || !Object.values(exportOptions).some(Boolean)}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {isExporting ? 'Preparing Export...' : 'Download Export Package'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

