import { useContext } from 'react';
import { TemplateContext } from './template-context';

export const useTemplate = () => useContext(TemplateContext);
