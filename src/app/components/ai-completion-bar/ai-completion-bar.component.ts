import { ChangeDetectionStrategy, Component, signal, computed, input } from '@angular/core';
import { NgIf, NgStyle, DecimalPipe } from '@angular/common';
import { CountUpModule } from 'ngx-countup';

// --- AiCompletionBar Component ---
// This component displays the animated progress bar and percentage.
@Component({
  selector: 'ai-completion-bar',
  templateUrl: './ai-completion-bar.component.html',
})
export class AiCompletionBar {
  // The percentage value is passed as an Input signal
  percentage = input.required<number>(); 

  // Computed signal to calculate the width style string (e.g., '78%')
  progressBarWidth = computed(() => `${this.percentage()}%`);
  
  // CountUp options for smooth percentage number animation
  countUpOptions = {
    duration: 1.0, // 1 second animation time for the number
    decimals: 0,
    suffix: '', 
    startVal: 0,
  };
}


