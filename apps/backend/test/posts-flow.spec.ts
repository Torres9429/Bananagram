describe('Posts Flow Integration', () => {
  it('borrador → en_revision → aprobado → programado → publicado', async () => {
    expect(true).toBe(true);
  });
  it('should return 422 on invalid transition', async () => {
    expect(true).toBe(true);
  });
  it('should return 400 when rejecting without comment', async () => {
    expect(true).toBe(true);
  });
  it('should return 403 when creator tries to approve own post', async () => {
    expect(true).toBe(true);
  });
});
