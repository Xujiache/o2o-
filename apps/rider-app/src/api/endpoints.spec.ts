import { describe, expect, it } from 'vitest';

import { Endpoints } from './index';

describe('rider-app Endpoints 常量', () => {
  it('rider 端接口前缀全部 /api/v1/r/*', () => {
    expect(Endpoints.SmsCode).toBe('/api/v1/r/auth/sms-code');
    expect(Endpoints.Login).toBe('/api/v1/r/auth/login');
    expect(Endpoints.Refresh).toBe('/api/v1/r/auth/refresh');
    expect(Endpoints.Logout).toBe('/api/v1/r/auth/logout');
    expect(Endpoints.OnboardingApply).toBe('/api/v1/r/onboarding/applications');
    expect(Endpoints.OnboardingStatus).toBe('/api/v1/r/onboarding/status');
    expect(Endpoints.Profile).toBe('/api/v1/r/profile');
    expect(Endpoints.OnlineStatus).toBe('/api/v1/r/online-status');
    expect(Endpoints.LocationBatch).toBe('/api/v1/r/location/batch');
    expect(Endpoints.TasksAvailable).toBe('/api/v1/r/tasks/available');
  });

  it('公共接口路径正确', () => {
    expect(Endpoints.Dictionaries).toBe('/api/v1/pub/dictionaries');
    expect(Endpoints.FilesUpload).toBe('/api/v1/pub/files/upload');
  });
});
