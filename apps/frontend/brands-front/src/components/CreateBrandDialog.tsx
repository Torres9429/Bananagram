'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FormDialog, LabeledField, LabeledSelect } from '@repo/ui/ui';
import { useListCategoriesQuery } from '@repo/ui/state';
import { useCreateBrandMutation } from '../store/api/brands.api';
import { BRAND_TYPE_OPTIONS } from '../lib/mock-data';

interface CreateBrandDialogProps {
  open: boolean;
  onClose: () => void;
}

// name -> slug: minúsculas, sin acentos, espacios/símbolos a guiones. No es
// una librería (`slugify`) a propósito — un caso de uso, una función de 5
// líneas no justifica una dependencia nueva.
const DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g'); // marcas diacríticas (acentos) tras NFD

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Primera versión: solo pide lo mínimo para crear la marca y obtener el
// connectUrl de Ayrshare (conectar redes sociales reales). allowedSocial
// fijo a Instagram — todavía no hay picker de redes, el catálogo real solo
// tiene esa por ahora (ver plan "conectar marca y cuenta de Instagram reales").
export function CreateBrandDialog({ open, onClose }: CreateBrandDialogProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [profileType, setProfileType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createBrand, { isLoading: isCreating }] = useCreateBrandMutation();
  const { data: categories = [] } = useListCategoriesQuery();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function reset() {
    setStep('form');
    setName('');
    setSlug('');
    setSlugTouched(false);
    setProfileType('');
    setCategoryId('');
    setLogoUrl('');
    setPrimaryColor('');
    setConnectUrl(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return;
    setError(null);
    try {
      const brand = await createBrand({
        name: name.trim(),
        slug: slug.trim(),
        profileType: profileType || undefined,
        categoryId: categoryId || undefined,
        logoUrl: logoUrl.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        allowedSocial: ['instagram'],
      }).unwrap();

      if (brand.connectUrl) {
        setConnectUrl(brand.connectUrl);
        setStep('success');
      } else {
        // No debería pasar (BrandsService siempre agrega connectUrl al
        // crear), pero si Ayrshare no está configurado no se rompe el flujo.
        handleClose();
      }
    } catch {
      setError('No se pudo crear la marca. Verifica los datos e intenta de nuevo.');
    }
  }

  return (
    <FormDialog
      open={open}
      title={step === 'form' ? 'Nueva marca' : 'Marca creada'}
      maxWidth="sm"
      confirmLabel={step === 'form' ? (isCreating ? 'Creando…' : 'Crear') : 'Listo'}
      confirmDisabled={step === 'form' && (!name.trim() || !slug.trim() || isCreating)}
      onClose={handleClose}
      onConfirm={step === 'form' ? handleCreate : handleClose}
    >
      {step === 'form' ? (
        <>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <LabeledField
            label="Nombre"
            placeholder="Ej. Café Aurora"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            autoFocus
          />
          <LabeledField
            label="Slug"
            placeholder="cafe-aurora"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            required
          />
          <LabeledSelect
            label="Tipo (opcional)"
            value={profileType}
            onChange={(e) => setProfileType(e.target.value as string)}
            displayEmpty
          >
            <MenuItem value=""><em>Sin especificar</em></MenuItem>
            {BRAND_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </LabeledSelect>
          <LabeledSelect
            label="Categoría (opcional)"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value as string)}
            displayEmpty
          >
            <MenuItem value=""><em>Sin categoría</em></MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
            ))}
          </LabeledSelect>
          <LabeledField
            label="Logo — URL (opcional)"
            placeholder="https://…"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          <LabeledField
            label="Color primario (opcional)"
            placeholder="#E0A800"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </>
      ) : (
        <Stack gap={2}>
          <Alert severity="success">La marca se creó correctamente.</Alert>
          <Typography variant="body2" color="text.secondary">
            Para publicar contenido real, conecta tus redes sociales desde el enlace de Ayrshare —
            ábrelo, inicia sesión con tu cuenta de Instagram Business/Creator y confirma la conexión.
          </Typography>
          <Box>
            <Button
              variant="contained"
              color="primary"
              endIcon={<OpenInNewIcon />}
              href={connectUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              Conectar redes sociales
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Cuando termines de conectar, vuelve aquí y sincroniza las cuentas conectadas.
          </Typography>
        </Stack>
      )}
    </FormDialog>
  );
}
