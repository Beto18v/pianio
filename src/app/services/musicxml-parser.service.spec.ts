import { TestBed } from '@angular/core/testing';

import { MusicXmlParserService } from './musicxml-parser.service';

describe('MusicXmlParserService', () => {
  let service: MusicXmlParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MusicXmlParserService);
  });

  it('maps MusicXML notes into the internal song model and keeps file annotations', () => {
    const song = service.parse(createTwoStaffMusicXml(), 'exercise.musicxml');

    expect(song.fileName).toBe('exercise.musicxml');
    expect(song.sourceFormat).toBe('musicxml');
    expect(song.ppq).toBeNull();
    expect(song.tempoBpm).toBe(90);
    expect(song.trackCount).toBe(2);
    expect(song.notes).toHaveLength(2);
    expect(song.duration).toBeCloseTo(2 / 3, 4);
    expect(song.notes.map((note) => ({ pitch: note.pitch, startTime: note.startTime }))).toEqual([
      { pitch: 52, startTime: 0 },
      { pitch: 60, startTime: 0 },
    ]);

    expect(song.fileNoteAnnotations?.['0-0-60']).toMatchObject({
      hand: 'right',
      finger: 2,
      handSource: 'file',
      fingerSource: 'file',
    });
    expect(song.fileNoteAnnotations?.['1-0-52']).toMatchObject({
      hand: 'left',
      finger: null,
      handSource: 'file',
      fingerSource: 'unavailable',
    });
  });

  it('keeps chord notes aligned at the same start time', () => {
    const song = service.parse(createChordMusicXml(), 'chord.musicxml');

    expect(song.notes.map((note) => ({ pitch: note.pitch, startTime: note.startTime }))).toEqual([
      { pitch: 60, startTime: 0 },
      { pitch: 64, startTime: 0 },
      { pitch: 67, startTime: 0.5 },
    ]);
    expect(song.duration).toBeCloseTo(1, 4);
  });

  it('throws a controlled error for invalid MusicXML content', () => {
    expect(() => service.parse('<invalid', 'broken.musicxml')).toThrow(
      'Could not parse the selected MusicXML file.',
    );
  });
});

function createTwoStaffMusicXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
      </attributes>
      <direction>
        <sound tempo="90"/>
      </direction>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>2</duration>
        <voice>1</voice>
        <staff>1</staff>
        <notations>
          <technical>
            <fingering>2</fingering>
          </technical>
        </notations>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>3</octave>
        </pitch>
        <duration>2</duration>
        <voice>2</voice>
        <staff>2</staff>
      </note>
    </measure>
  </part>
</score-partwise>`;
}

function createChordMusicXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
      </attributes>
      <direction>
        <sound tempo="120"/>
      </direction>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
      </note>
      <note>
        <chord/>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <voice>1</voice>
      </note>
    </measure>
  </part>
</score-partwise>`;
}
