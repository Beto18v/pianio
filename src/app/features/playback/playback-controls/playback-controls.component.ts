import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { siteContent } from '../../../core/site';
import { PlaybackAudioService } from '../../../services/playback-audio.service';
import { PlaybackService } from '../../../services/playback.service';

@Component({
  selector: 'app-playback-controls',
  imports: [DecimalPipe],
  templateUrl: './playback-controls.component.html',
  styleUrl: './playback-controls.component.scss',
})
export class PlaybackControlsComponent {
  protected readonly site = siteContent;
  protected readonly playbackService = inject(PlaybackService);
  protected readonly playbackAudioService = inject(PlaybackAudioService);
  protected readonly song = this.playbackService.song;
  protected readonly playbackState = this.playbackService.playbackState;
  protected readonly hasSong = this.playbackService.hasSong;
  protected readonly canPlay = this.playbackService.canPlay;
  protected readonly isStopDisabled = computed(() => {
    const playbackState = this.playbackState();

    return !this.hasSong() || (!playbackState.isPlaying && playbackState.currentTime === 0);
  });

  protected play(): void {
    void this.playbackAudioService.prepareForPlayback();
    this.playbackService.play();
  }

  protected pause(): void {
    this.playbackService.pause();
  }

  protected stop(): void {
    this.playbackService.stop();
  }

  protected onSeek(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.playbackService.seek(Number(input.value));
  }
}
