export enum AppModule {
  USERS = 'users',
  /**
   * @deprecated Legacy del dominio pre-v3 (Cliente = "Brand"). El dominio actual
   * generaliza a Profile (brand/company/organization/creator/personal) — ver
   * brands-front/src/lib/mock-data.ts. NO renombrar el valor 'brands': es el
   * mismo string que persiste el backend en role_permissions y el JWT
   * (permissions[AppModule.BRANDS]). Conservar hasta que /brands se retire y
   * el backend migre este módulo a "profiles".
   */
  BRANDS = 'brands',
  CATALOGS = 'catalogs',
  POST = 'post',
  CAMPAIGNS = 'campaigns',
  METRICS = 'metrics',
  SCORE = 'score',
  REPORTS = 'reports',
}
