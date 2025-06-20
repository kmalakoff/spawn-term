import { createContext } from 'react';
import type Store from './Store.js';

export default createContext<Store>(undefined);
