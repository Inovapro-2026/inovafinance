import { motion } from 'framer-motion';
import { Delete, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  maxLength?: number;
  autoSubmit?: boolean;
}

export function NumericKeypad({ 
  value, 
  onChange, 
  onSubmit,
  maxLength = 6,
  autoSubmit = false
}: NumericKeypadProps) {
  const { toast } = useToast();
  
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['delete', '0', 'paste'],
  ];

  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      onChange(value.slice(0, -1));
    } else if (key === 'paste') {
      handlePaste();
    } else if (value.length < maxLength) {
      const newValue = value + key;
      onChange(newValue);
    }
  };

  // Watch for value changes and auto-submit when full
  const handleAutoSubmit = (newValue: string) => {
    if (autoSubmit && newValue.length === maxLength) {
      setTimeout(() => {
        onSubmit();
      }, 300);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Extract only numbers
      const numbers = text.replace(/\D/g, '');
      
      if (numbers.length > 0) {
        const pastedValue = numbers.slice(0, maxLength);
        onChange(pastedValue);
        
        toast({
          title: "Código colado!",
          description: `Matrícula ${pastedValue} inserida`,
        });
        
        // Auto submit if we have the full length
        if (autoSubmit && pastedValue.length === maxLength) {
          setTimeout(() => {
            onSubmit();
          }, 300);
        }
      } else {
        toast({
          title: "Nenhum número encontrado",
          description: "O texto copiado não contém números",
          variant: "destructive"
        });
      }
    } catch (err) {
      toast({
        title: "Não foi possível colar",
        description: "Permita o acesso à área de transferência",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-xs mx-auto">
      {keys.flat().map((key, index) => {
        const isDelete = key === 'delete';
        const isPaste = key === 'paste';

        return (
          <motion.button
            key={index}
            type="button"
            className={cn(
              "keypad-btn",
              isPaste && "bg-primary/20 hover:bg-primary/30"
            )}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleKeyPress(key)}
          >
            {isDelete ? (
              <Delete className="w-6 h-6 text-muted-foreground" />
            ) : isPaste ? (
              <Clipboard className="w-5 h-5 text-primary" />
            ) : (
              key
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
