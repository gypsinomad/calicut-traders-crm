import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

interface TranslatedTextProps {
  children: string;
  className?: string;
  as?: React.ElementType;
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => {
  const { translate, language } = useTranslation();
  const [translated, setTranslated] = useState<string>(children);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (language === 'en') {
      setTranslated(children);
      return;
    }

    const doTranslate = async () => {
      setLoading(true);
      const result = await translate(children);
      setTranslated(result);
      setLoading(false);
    };

    doTranslate();
  }, [children, language, translate]);

  return (
    <Component className={`${className} ${loading ? 'opacity-50' : ''}`}>
      {translated}
    </Component>
  );
};
