from app.security import hash_password, hash_token, new_session_token, verify_password


def test_a_password_verifies_against_its_own_hash() -> None:
    password_hash = hash_password("correct horse")

    assert verify_password(password_hash, "correct horse")
    assert not verify_password(password_hash, "wrong horse")


def test_hashes_are_salted() -> None:
    assert hash_password("same") != hash_password("same")


def test_a_malformed_hash_fails_instead_of_raising() -> None:
    assert not verify_password("not-a-hash", "whatever")


def test_session_tokens_are_unique_and_long() -> None:
    tokens = {new_session_token() for _ in range(50)}

    assert len(tokens) == 50
    assert all(len(token) >= 40 for token in tokens)


def test_token_hash_is_stable_and_hides_the_token() -> None:
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != hash_token("abd")
    assert "abc" not in hash_token("abc")
