import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Un Cliente puede tener varias marcas (ej. Barcel con varios productos) —
// GET /brands ya las devuelve todas, esto solo recuerda cuál está activa en
// la sesión de UI. Vive en Redux (no useState) para persistir al navegar
// entre /profile y /profile/campaigns sin perder la selección.
interface SelectedBrandState {
  selectedBrandId: string | null;
}

const initialState: SelectedBrandState = { selectedBrandId: null };

const selectedBrandSlice = createSlice({
  name: 'selectedBrand',
  initialState,
  reducers: {
    setSelectedBrandId(state, action: PayloadAction<string>) {
      state.selectedBrandId = action.payload;
    },
  },
});

export const { setSelectedBrandId } = selectedBrandSlice.actions;
export const selectedBrandReducer = selectedBrandSlice.reducer;
