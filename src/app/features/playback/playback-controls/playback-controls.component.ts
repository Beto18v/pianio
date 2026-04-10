import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { siteContent } from '../../../core/site';
import { PlaybackAudioService } from '../../../services/playback-audio.service';
import { PlaybackService } from '../../../services/playback.service';
import { PracticeService } from '../../../services/practice.service';

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
  protected readonly practiceService = inject(PracticeService);
  protected readonly song = this.playbackService.song;
  protected readonly playbackState = this.playbackService.playbackState;
  protected readonly hasSong = this.playbackService.hasSong;
  protected readonly canPlay = this.playbackService.canPlay;
  protected readonly practiceState = this.practiceService.state;
  protected readonly isPracticeModeEnabled = this.practiceService.isPracticeModeEnabled;
  protected readonly shouldBlockPlayback = this.practiceService.shouldBlockPlayback;
  protected readonly practiceMatchStatus = computed(() => {
    if (!this.isPracticeModeEnabled()) {
      return this.site.playback.practice.states.disabled;
    }

    if (this.shouldBlockPlayback()) {
      return this.site.playback.practice.states.blocked;
    }

    return this.site.playback.practice.states.match;
  });
  protected readonly isStopDisabled = computed(() => {
    const playbackState = this.playbackState();

    return !this.hasSong() || (!playbackState.isPlaying && playbackState.currentTime === 0);
  });

  protected play(): void {
    void this.playbackAudioService.prepareForPlayback();
    this.practiceService.requestPlay();
  }

  protected pause(): void {
    this.practiceService.requestPause();
  }

  protected stop(): void {
    this.practiceService.requestStop();
  }

  protected onPracticeModeToggle(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.practiceService.setPracticeModeEnabled(input.checked);
  }

  protected onSeek(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.playbackService.seek(Number(input.value));
  }

  protected formatPitchList(pitches: ReadonlyArray<number>): string {
    if (pitches.length === 0) {
      return this.site.playback.practice.emptyPitches;
    }

    return pitches.join(', ');
  }
}
