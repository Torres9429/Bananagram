import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AnalyticsFiltersState, DateRange, PostStatus, SocialNetworkCode } from '../lib/analytics/types';

// Slice de Analytics — almacena ÚNICAMENTE filtros, selección actual, nivel de drill
// y período. Los datos (mock-metrics.ts) nunca se duplican aquí; se leen y filtran
// vía selectores memoizados (ver analytics.selectors.ts).

const initialState: AnalyticsFiltersState = {
  networks: [],
  selectedNetwork: null,
  profileId: null,
  campaignId: null,
  postId: null,
  status: null,
  dateRange: null,
  cmName: null,
  designerName: null,
  category: null,
  specialty: null,
  drillLevel: 'global',
};

function deriveDrillLevel(state: AnalyticsFiltersState): AnalyticsFiltersState['drillLevel'] {
  if (state.postId) return 'post';
  if (state.campaignId) return 'campaign';
  if (state.selectedNetwork || state.networks.length > 0) return 'network';
  return 'global';
}

const analyticsFiltersSlice = createSlice({
  name: 'analyticsFilters',
  initialState,
  reducers: {
    /** Click en una red (ej. Instagram) — toggle: clic de nuevo la deselecciona. */
    toggleNetwork(state, action: PayloadAction<SocialNetworkCode>) {
      const code = action.payload;
      state.networks = state.networks.includes(code)
        ? state.networks.filter((n) => n !== code)
        : [...state.networks, code];
      state.drillLevel = deriveDrillLevel(state);
    },
    /** Click en una campaña — filtra y sube el nivel de drill. */
    selectCampaign(state, action: PayloadAction<string | null>) {
      state.campaignId = action.payload;
      if (!action.payload) state.postId = null;
      state.drillLevel = deriveDrillLevel(state);
    },
    /** Click en una publicación — nivel de drill más profundo. */
    selectPost(state, action: PayloadAction<string | null>) {
      state.postId = action.payload;
      state.drillLevel = deriveDrillLevel(state);
    },
    /** Scope de tenancy (qué perfil se está analizando) — no es un nivel de drill. */
    setProfile(state, action: PayloadAction<string | null>) {
      state.profileId = action.payload;
    },
    setDateRange(state, action: PayloadAction<DateRange | null>) {
      state.dateRange = action.payload;
    },
    /** Toggle de estado de publicación (multi-select), igual patrón que toggleNetwork. */
    toggleStatus(state, action: PayloadAction<PostStatus>) {
      const value = action.payload;
      const current = state.status ?? [];
      const next = current.includes(value) ? current.filter((s) => s !== value) : [...current, value];
      state.status = next.length > 0 ? next : null;
    },
    /** Set directo del arreglo completo — para el onChange nativo de <Select multiple>. */
    setNetworks(state, action: PayloadAction<SocialNetworkCode[]>) {
      state.networks = action.payload;
      state.drillLevel = deriveDrillLevel(state);
    },
    /**
     * Fase 3 — click en SocialNetworkTabs. Es el eje principal de navegación:
     * cambiar de red resetea campaña/publicación (nuevo contexto de drill) y
     * limpia el multi-select networks[] del Drawer para que no compitan entre sí.
     */
    selectNetwork(state, action: PayloadAction<SocialNetworkCode | null>) {
      const next = action.payload;
      if (state.selectedNetwork !== next) {
        state.campaignId = null;
        state.postId = null;
      }
      state.selectedNetwork = next;
      state.networks = next ? [] : state.networks;
      state.drillLevel = deriveDrillLevel(state);
    },
    setStatuses(state, action: PayloadAction<PostStatus[]>) {
      state.status = action.payload.length > 0 ? action.payload : null;
    },
    // Preparados para cuando exista dato real de equipo/categoría (ver types.ts) —
    // el control correspondiente en AnalyticsFilterBar vive deshabilitado mientras tanto.
    setCmName(state, action: PayloadAction<string | null>) {
      state.cmName = action.payload;
    },
    setDesignerName(state, action: PayloadAction<string | null>) {
      state.designerName = action.payload;
    },
    setCategory(state, action: PayloadAction<string | null>) {
      state.category = action.payload;
    },
    setSpecialty(state, action: PayloadAction<string | null>) {
      state.specialty = action.payload;
    },
    /** Limpia selección de red/campaña/publicación, conserva marca y período. */
    resetToGlobal(state) {
      state.networks = [];
      state.selectedNetwork = null;
      state.campaignId = null;
      state.postId = null;
      state.drillLevel = 'global';
    },
    /** Limpia absolutamente todos los filtros — usado por el botón "Limpiar filtros" de la barra. */
    clearAllFilters() {
      return initialState;
    },
  },
});

export const {
  toggleNetwork,
  selectNetwork,
  selectCampaign,
  selectPost,
  setProfile,
  setDateRange,
  toggleStatus,
  setNetworks,
  setStatuses,
  setCmName,
  setDesignerName,
  setCategory,
  setSpecialty,
  resetToGlobal,
  clearAllFilters,
} = analyticsFiltersSlice.actions;
export const analyticsFiltersReducer = analyticsFiltersSlice.reducer;
