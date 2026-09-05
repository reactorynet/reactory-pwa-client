import React, { useState, useMemo, useCallback } from 'react';
import { IAIPersona } from '../types';
import PersonaCard from './PersonaCard';
import TagCloud, { TagItem } from '../../TagCloud';
import { arePanelPropsEqual, glassPanelSx } from '../utils';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

const DEFAULT_PERSONA_TAGS: Record<string, string[]> = {
  ReactorAIPersona: ['orchestrator', 'development', 'reactory', 'ai'],
  BookTutorAIPersona: ['education', 'books', 'learning', 'tutor'],
  DataAnalyticsDanaAIPersona: ['data', 'analytics', 'etl', 'metrics'],
  InfrastructureIvyAIPersona: ['infrastructure', 'devops', 'kubernetes', 'aws', 'terraform'],
  SecuritySamAIPersona: ['security', 'compliance', 'threat-detection', 'auth'],
  WorkflowWillAIPersona: ['workflow', 'automation', 'engine', 'orchestration'],
  CEOClive: ['executive', 'strategy', 'management', 'jira'],
  cmd: ['cli', 'terminal', 'execution', 'system'],
  Formidable: ['forms', 'ui', 'reactory', 'schema'],
  GitGuardian: ['git', 'github', 'devops', 'version-control'],
  QualityQuinn: ['qa', 'testing', 'automation', 'quality'],
  support: ['support', 'tickets', 'triage', 'customer-service'],
  SlackAssistant: ['slack', 'messaging', 'collaboration', 'integration'],
  ClassroomAdmissionsCounselor: ['admissions', 'education', 'courses', 'students'],
  ClassroomStudentSupport: ['education', 'support', 'students', 'learning'],
  SocialSandy: ['social-media', 'analytics', 'marketing', 'monitoring'],
  CorpITCarl: ['corporate-it', 'governance', 'jira', 'compliance'],
  FinCrimeFiona: ['compliance', 'fraud', 'security', 'sanctions'],
  IdentityIan: ['identity', 'auth', 'security', 'oidc'],
  MarketingMia: ['marketing', 'cms', 'contentful', 'growth'],
  MobileMax: ['mobile', 'ios', 'android', 'react-native'],
  OpsOliver: ['operations', 'workflow', 'camunda', 'backoffice'],
  PaymentsPam: ['payments', 'gateways', 'treasury', 'routing'],
  PlatformPaul: ['platform', 'architecture', 'kubernetes', 'aws'],
  PricingPete: ['pricing', 'quotes', 'observability', 'metrics'],
  ReconRachel: ['reconciliation', 'finance', 'celery', 'matching'],
  RemitPlusRay: ['remittance', 'blockchain', 'solana', 'crypto'],
  SendwaveSam: ['python', 'flask', 'postgres', 'backend'],
  TalonTessa: ['loyalty', 'campaigns', 'promotions', 'discounts'],
};

export const extractPersonaTags = (persona: IAIPersona): string[] => {
  const tags: string[] = [];
  if (Array.isArray((persona as any).tags)) {
    (persona as any).tags.forEach((t: any) => {
      if (typeof t === 'string' && t.trim()) tags.push(t.trim());
    });
  }
  if (persona.id && DEFAULT_PERSONA_TAGS[persona.id]) {
    DEFAULT_PERSONA_TAGS[persona.id].forEach((t) => tags.push(t));
  }
  if (persona.modelId && typeof persona.modelId === 'string' && persona.modelId.trim()) {
    tags.push(persona.modelId.trim());
  }
  if (Array.isArray(persona.toolProfiles)) {
    persona.toolProfiles.forEach((tp) => {
      if (tp?.name && typeof tp.name === 'string' && tp.name.trim()) tags.push(tp.name.trim());
    });
  }
  return Array.from(new Set(tags));
};

interface PersonaSelectorProps {
  open: boolean;
  onClose: () => void;
  personas: IAIPersona[];
  selectedPersona: IAIPersona | null;
  onPersonaSelect: (persona: IAIPersona) => void;
  Material: any;
  toCamelCaseLabel: (str: string) => string;
  il8n: any;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  open,
  onClose,
  personas,
  selectedPersona,
  onPersonaSelect,
  Material,
  toCamelCaseLabel,
  il8n
}) => {
  const theme = Material.MaterialCore.useTheme ? Material.MaterialCore.useTheme() : {};
  const mode = theme?.palette?.mode ?? 'dark';
  const {
    Paper,
    Typography,
    Box,
    IconButton,
    TextField,
    InputAdornment,
    Button,
  } = Material.MaterialCore;

  const Search = Material?.MaterialIcons?.Search || SearchIcon;
  const Clear = Material?.MaterialIcons?.Clear || ClearIcon;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Collect all unique tags across all personas with counts
  const availableTags = useMemo<TagItem[]>(() => {
    const tagCountMap = new Map<string, number>();
    personas.forEach((persona) => {
      const pTags = extractPersonaTags(persona);
      pTags.forEach((tag) => {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({
        id: tag,
        label: tag,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [personas]);

  // Client-side filtering by name (and description/model/tags) + tag selection
  const filteredPersonas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return personas
      .filter((persona) => {
        // 1. Text query filter
        if (query) {
          const nameMatch = (persona.name || '').toLowerCase().includes(query);
          const descMatch = (persona.description || '').toLowerCase().includes(query);
          const modelMatch = (persona.modelId || '').toLowerCase().includes(query);
          const tagMatch = (Array.isArray((persona as any).tags) ? (persona as any).tags : []).some(
            (t: string) => typeof t === 'string' && t.toLowerCase().includes(query)
          );
          if (!nameMatch && !descMatch && !modelMatch && !tagMatch) {
            return false;
          }
        }

        // 2. Tag filter
        if (selectedTags.length > 0) {
          const pTags = new Set(extractPersonaTags(persona).map((t) => t.toLowerCase()));
          const matches = selectedTags.some((st) => pTags.has(st.toLowerCase()));
          if (!matches) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (a.name?.toLowerCase() ?? '').localeCompare(b.name?.toLowerCase() ?? ''));
  }, [personas, searchQuery, selectedTags]);

  const isFiltered = searchQuery.trim().length > 0 || selectedTags.length > 0;

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
  }, []);

  return (
    <Paper
      elevation={3}
      sx={{
        ...glassPanelSx(mode),
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        zIndex: 2,
        containerType: 'inline-size',
      }}
    >
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <IconButton
          onClick={onClose}
          sx={{ mr: 2 }}
          aria-label="Close persona selection"
        >
          <Material.MaterialIcons.ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
          {il8n?.t('reactor.client.persona.select.title', { defaultValue: 'Select an Agent' })}
        </Typography>
        {isFiltered && personas.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {il8n?.t('reactor.client.persona.filterCount', {
              defaultValue: '{{count}} of {{total}}',
              count: filteredPersonas.length,
              total: personas.length,
            })}
          </Typography>
        )}
      </Box>

      {/* Search Input Bar */}
      {personas.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={il8n?.t('reactor.client.persona.search.placeholder', { defaultValue: 'Search agents by name...' })}
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')} aria-label="Clear search">
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              bgcolor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              borderRadius: 1,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
            }}
          />
        </Box>
      )}

      {/* Tag Cloud Filter Widget */}
      {availableTags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <TagCloud
            tags={availableTags}
            selectedTags={selectedTags}
            onTagSelected={setSelectedTags}
            showClear={true}
            clearLabel={il8n?.t('reactor.client.tagcloud.all', { defaultValue: 'All' }) || 'All'}
            maxDisplay={15}
            Material={Material}
            il8n={il8n}
          />
        </Box>
      )}

      {/* Cards Grid or Empty States */}
      {personas.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {il8n?.t('reactor.client.persona.none', { defaultValue: 'No personas available' })}
          </Typography>
        </Box>
      ) : filteredPersonas.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
            {il8n?.t('reactor.client.persona.noMatches', { defaultValue: 'No agents match your search or filter' })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {il8n?.t('reactor.client.persona.noMatchesDetail', { defaultValue: 'Try searching with a different term or clearing selected tags.' })}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
          >
            {il8n?.t('reactor.client.persona.clearFilters', { defaultValue: 'Clear filters' })}
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 2,
            '@container (max-width: 599px)': {
              gridTemplateColumns: '1fr',
            },
            '@container (min-width: 600px) and (max-width: 899px)': {
              gridTemplateColumns: 'repeat(2, 1fr)',
            },
            '@container (min-width: 900px) and (max-width: 1199px)': {
              gridTemplateColumns: 'repeat(3, 1fr)',
            },
            '@container (min-width: 1200px)': {
              gridTemplateColumns: 'repeat(4, 1fr)',
            },
          }}
        >
          {filteredPersonas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isSelected={selectedPersona?.id === persona.id}
              onSelect={onPersonaSelect}
              onDetails={(persona) => {
                // show details using PersonaDetailsDialog
              }}
              Material={Material}
              toCamelCaseLabel={toCamelCaseLabel}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
};

// Memoised with the shared panel comparator: while closed this panel skips
// the parent's re-renders entirely (see `arePanelPropsEqual`).
export default React.memo(PersonaSelector, arePanelPropsEqual); 