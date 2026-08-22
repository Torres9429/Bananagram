import { useDispatch, useSelector } from 'react-redux';
import { useListMyBrandsQuery } from '../store/api/brands.api';
import { setSelectedBrandId } from '../store/selectedBrand.slice';
import type { AppDispatch, RootState } from '../interfaces/interface';

// Fuente única de "cuál marca está activa" para toda la sección de Cliente
// (/profile, /profile/campaigns) — antes cada pantalla tomaba myBrands[0] a
// ciegas, sin forma de elegir cuando el usuario tiene varias marcas.
export function useSelectedBrand() {
  const { data: myBrands = [], isLoading } = useListMyBrandsQuery();
  const dispatch = useDispatch<AppDispatch>();
  const selectedId = useSelector((s: RootState) => s.selectedBrand.selectedBrandId);
  const selectedBrand = myBrands.find((b) => b.id === selectedId) ?? myBrands[0] ?? null;

  return {
    myBrands,
    selectedBrand,
    selectedBrandId: selectedBrand?.id,
    setSelectedBrandId: (id: string) => dispatch(setSelectedBrandId(id)),
    isLoading,
  };
}
