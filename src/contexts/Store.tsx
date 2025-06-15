import { createContext } from 'react';
import type { Store } from '../types.js';

export default createContext<Store>(undefined);
