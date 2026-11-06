
import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Axios instance
const apiClient = axios.create({
  baseURL: API_URL,
});

// Add JWT token automatically to protected requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hireai_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle backend errors and expired login sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('hireai_token');

      if (token) {
        localStorage.removeItem('hireai_token');
        localStorage.removeItem('hireai_user');

        if (window.location.pathname !== '/') {
          window.location.assign('/');
        }
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    const requestError = new Error(message);
    requestError.status = error.response?.status;

    return Promise.reject(requestError);
  }
);

// Logged-in user (saved at login)
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('hireai_user'));
  } catch {
    return null;
  }
};

// Backend me route na ho (404/405) to feature browser storage par chalta hai
const isMissingRoute = (error) => error?.status === 404 || error?.status === 405;

const localKey = (name) => `hireai_${name}_${getUser()?.id ?? 'guest'}`;

const readLocal = (name, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(localKey(name)));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (name, value) => {
  try {
    localStorage.setItem(localKey(name), JSON.stringify(value));
  } catch {
    throw new Error('Could not save on this device. Browser storage is full or blocked.');
  }
};

// AUTH APIs
export const register = async (userData) => {
  const response = await apiClient.post('/auth/register', {
    ...userData,
    role: userData.role?.toLowerCase(),
  });

  return response.data;
};

export const login = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);

  return response.data;
};

// JOB APIs
export const getJobs = async (filters = {}) => {
  const response = await apiClient.get('/jobs', {
    params: {
      search: filters.search || '',
      location: filters.location || '',
      type: filters.type || '',
    },
  });

  return response.data;
};

export const getJob = async (jobId) => {
  const response = await apiClient.get(`/jobs/${jobId}`);
  return response.data;
};

// APPLICATION APIs
export const applyToJob = async (jobId, resumeFile) => {
  const formData = new FormData();
  formData.append('resume', resumeFile);

  const response = await apiClient.post(
    `/jobs/${jobId}/apply`,
    formData
  );

  return response.data;
};

export const myApplications = async () => {
  const response = await apiClient.get('/my/applications');
  return response.data;
};

export const withdrawApplication = async (applicationId) => {
  try {
    const response = await apiClient.delete(
      `/my/applications/${applicationId}`
    );

    return response.data;
  } catch (error) {
    if (isMissingRoute(error)) {
      throw new Error('Withdrawing an application is not available yet. Please contact the recruiter.', { cause: error });
    }

    throw error;
  }
};

// SAVED JOB APIs (server na ho to isi browser me save hota hai)
export const getSavedJobs = async () => {
  try {
    const response = await apiClient.get('/saved-jobs');
    return response.data;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;

    return readLocal('saved_jobs', []);
  }
};

export const saveJob = async (jobId) => {
  try {
    const response = await apiClient.post(`/saved-jobs/${jobId}`);
    return response.data;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;

    const job = await getJob(jobId);
    const saved = readLocal('saved_jobs', []);

    if (!saved.some((item) => String(item.id) === String(jobId))) {
      writeLocal('saved_jobs', [job, ...saved]);
    }

    return { message: 'Job saved' };
  }
};

export const removeSavedJob = async (jobId) => {
  try {
    const response = await apiClient.delete(`/saved-jobs/${jobId}`);
    return response.data;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;

    const saved = readLocal('saved_jobs', []);

    writeLocal(
      'saved_jobs',
      saved.filter((item) => String(item.id) !== String(jobId))
    );

    return { message: 'Job removed' };
  }
};

// CANDIDATE RESUME BUILDER APIs

// Saved resume load karna (server na ho to isi browser se)
export const getCandidateResume = async () => {
  try {
    const response = await apiClient.get('/candidate-resume');
    return response.data;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;

    return { resume: readLocal('resume', null) };
  }
};

// Resume save/update karna
export const saveCandidateResume = async (resumeData) => {
  try {
    const response = await apiClient.put('/candidate-resume', resumeData);
    return response.data;
  } catch (error) {
    if (!isMissingRoute(error)) throw error;

    writeLocal('resume', resumeData);

    return { message: 'Resume saved on this device.' };
  }
};

// CANDIDATE INTERVIEW API
export const getMyInterviews = async () => {
  const response = await apiClient.get('/interviews/my');
  return response.data;
};

// RECRUITER APIs (for Kinjal's pages)
export const createJob = async (jobData) => {
  const response = await apiClient.post('/jobs', jobData);
  return response.data;
};

export const getApplicants = async (jobId) => {
  const response = await apiClient.get(`/jobs/${jobId}/applicants`);
  return response.data;
};

export const updateStatus = async (applicationId, status) => {
  const response = await apiClient.put(
    `/applications/${applicationId}/status`,
    { status }
  );

  return response.data;
};

export const getRecruiterInterviews = async () => {
  const response = await apiClient.get('/interviews');
  return response.data;
};

export const createInterview = async (interviewData) => {
  const response = await apiClient.post('/interviews', interviewData);
  return response.data;
};

// OPEN RESUME (Recruiter)
// Window click ke time hi khulti hai taaki popup blocker na roke
export const openResume = async (applicationId) => {
  const resumeWindow = window.open('', '_blank');

  try {
    const response = await apiClient.get(
      `/applications/${applicationId}/resume`,
      { responseType: 'blob' }
    );

    const file = new Blob([response.data], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(file);

    if (resumeWindow) {
      resumeWindow.location.href = fileURL;
    } else {
      window.open(fileURL, '_blank');
    }

    setTimeout(() => URL.revokeObjectURL(fileURL), 60000);
  } catch (error) {
    if (resumeWindow) resumeWindow.close();

    if (error.status === 404) {
      throw new Error('Resume file was not found.', { cause: error });
    }

    if (error.status === 403) {
      throw new Error('You can only open resumes for your own jobs.', { cause: error });
    }

    throw error;
  }
};

// Export axios instance if required
export default apiClient;
